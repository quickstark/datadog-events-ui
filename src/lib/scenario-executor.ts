import { updateScenarioStatus, updateEventStatus } from "@/lib/execution-tracker"
import { saveExecutionRun, ExecutionRun } from "@/lib/storage/execution-history"
import { updateScenario } from "@/lib/storage/scenarios"
import { DatadogEventsClient } from "@/lib/datadog/events-client"
import { DatadogLogsClient } from "@/lib/datadog/logs-client"
import { SESClient } from "@/lib/aws/ses-client"

export class ScenarioExecutor {
  private settings: any
  private executionRunId: string

  constructor(settings: any, executionRunId: string) {
    this.settings = settings
    this.executionRunId = executionRunId
  }

  async executeScenario(scenario: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Update scenario status to running
      updateScenarioStatus(this.executionRunId, scenario.id, 'running')
      console.log(`[ScenarioExecutor] Started execution of scenario: ${scenario.name}`)
      
      // Sort events by delay
      const sortedEvents = [...scenario.events].sort((a, b) => a.delay - b.delay)
      const executionResults = []
      let hasErrors = false

      // Execute events in sequence with proper delays
      let lastDelay = 0
      for (const event of sortedEvents) {
        try {
          // Update event status to running with retry
          let statusUpdated = false
          for (let i = 0; i < 3; i++) {
            statusUpdated = updateEventStatus(this.executionRunId, scenario.id, event.id, 'running')
            if (statusUpdated) break
            console.warn(`[ScenarioExecutor] Failed to update event status to running, retry ${i + 1}/3`)
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          
          if (!statusUpdated) {
            console.error(`[ScenarioExecutor] Failed to update event status to running after 3 attempts`)
          }
          
          // Wait for the delay between events
          const waitTime = Math.max(0, event.delay - lastDelay)
          if (waitTime > 0) {
            console.log(`[ScenarioExecutor] Waiting ${waitTime}s before executing event: ${event.id}`)
            await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
          }
          lastDelay = event.delay

          console.log(`[ScenarioExecutor] Executing event: ${event.id} (type: ${event.type})`)
          
          // Execute the event with timeout protection
          let result
          const executeWithTimeout = async (executeFunction: () => Promise<any>, timeoutMs: number = 30000) => {
            return Promise.race([
              executeFunction(),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Event execution timed out after ${timeoutMs}ms`)), timeoutMs)
              )
            ])
          }
          
          switch (event.type) {
            case "datadog-event":
              result = await executeWithTimeout(() => this.executeDatadogEvent(event, scenario))
              break
            case "datadog-log":
              result = await executeWithTimeout(() => this.executeDatadogLog(event, scenario))
              break
            case "email":
              result = await executeWithTimeout(() => this.executeEmail(event, scenario), 45000) // Longer timeout for email
              break
            default:
              throw new Error(`Unknown event type: ${event.type}`)
          }

          executionResults.push({
            eventId: event.id,
            type: event.type,
            status: "success",
            delay: event.delay,
            executedAt: new Date().toISOString(),
            result
          })

          // Update event status to completed with retry
          let completedStatusUpdated = false
          for (let i = 0; i < 5; i++) {
            completedStatusUpdated = updateEventStatus(this.executionRunId, scenario.id, event.id, 'completed')
            if (completedStatusUpdated) break
            console.warn(`[ScenarioExecutor] Failed to update event status to completed, retry ${i + 1}/5`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
          
          if (completedStatusUpdated) {
            console.log(`[ScenarioExecutor] Event ${event.id} completed successfully`)
          } else {
            console.error(`[ScenarioExecutor] Failed to update event status to completed after 5 attempts - event may appear stuck`)
          }
          
        } catch (error) {
          console.error(`[ScenarioExecutor] Event ${event.id} failed:`, error)
          hasErrors = true
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          
          executionResults.push({
            eventId: event.id,
            type: event.type,
            status: "error",
            delay: event.delay,
            executedAt: new Date().toISOString(),
            error: errorMessage
          })
          
          // Update event status to failed with retry
          let failedStatusUpdated = false
          for (let i = 0; i < 5; i++) {
            failedStatusUpdated = updateEventStatus(this.executionRunId, scenario.id, event.id, 'failed', errorMessage)
            if (failedStatusUpdated) break
            console.warn(`[ScenarioExecutor] Failed to update event status to failed, retry ${i + 1}/5`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
          
          if (failedStatusUpdated) {
            console.log(`[ScenarioExecutor] Event ${event.id} marked as failed`)
          } else {
            console.error(`[ScenarioExecutor] Failed to update event status to failed after 5 attempts - event may appear stuck`)
          }
        }
      }

      // Update scenario status based on execution results
      const newStatus = hasErrors ? "failed" : "completed"
      updateScenarioStatus(this.executionRunId, scenario.id, newStatus as 'completed' | 'failed')
      
      // Try to update scenario status in storage
      try {
        await updateScenario(scenario.id, { status: newStatus })
      } catch (updateError) {
        console.error('[ScenarioExecutor] Failed to update scenario status in storage:', updateError)
      }

      // Calculate execution duration
      const duration = Math.round((Date.now() - startTime) / 1000)

      // Save execution history
      const executionRun: ExecutionRun = {
        id: `${this.executionRunId}-${scenario.id}`, // Unique ID for this scenario run
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        timestamp: new Date().toISOString(),
        status: newStatus,
        duration,
        events: executionResults.map(result => ({
          id: result.eventId,
          type: result.type,
          status: result.status as 'success' | 'error',
          delay: result.delay,
          executedAt: result.executedAt,
          message: result.status === "success" ? "Event executed successfully" : (result.error || "Unknown error"),
          error: result.error
        })),
        summary: {
          total: sortedEvents.length,
          successful: executionResults.filter(r => r.status === "success").length,
          failed: executionResults.filter(r => r.status === "error").length
        }
      }
      
      await saveExecutionRun(executionRun)
      console.log(`[ScenarioExecutor] Scenario ${scenario.name} completed. Status: ${newStatus}, Duration: ${duration}s`)
      
    } catch (error) {
      console.error(`[ScenarioExecutor] Error executing scenario ${scenario.name}:`, error)
      
      // Mark scenario as failed
      try {
        await updateScenario(scenario.id, { status: "failed" })
        updateScenarioStatus(this.executionRunId, scenario.id, 'failed')
      } catch (updateError) {
        console.error("[ScenarioExecutor] Failed to update scenario status:", updateError)
      }
      
      throw error // Re-throw to be handled by caller
    }
  }

  private async executeDatadogEvent(event: any, scenario: any) {
    const client = new DatadogEventsClient(this.settings.datadog)
    
    // Add tracking tags
    const trackingTags = [
      `scenario_id:${scenario.id}`,
      `scenario_name:${scenario.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      `execution_run_id:${this.executionRunId}`,
      `event_id:${event.id}`,
      'source:synthetic-events'
    ]
    
    // Validate event data
    if (!event.title?.trim() && !event.text?.trim()) {
      throw new Error('Datadog event must have either a title or text')
    }
    
    const eventData = {
      title: event.title || 'Synthetic Event',
      text: event.text || 'Event from synthetic scenario',
      tags: [...(event.tags || []), ...trackingTags],
      priority: event.priority || 5,
      alert_type: event.alert_type || 'info',
      ...(event.aggregation_key && { aggregation_key: event.aggregation_key }),
      ...(event.source_type_name && { source_type_name: event.source_type_name }),
      ...(event.date_happened && { date_happened: event.date_happened }),
      ...(event.device_name && { device_name: event.device_name }),
      ...(event.host && { host: event.host }),
      ...(event.related_event_id && { related_event_id: event.related_event_id })
    }

    return await client.sendEvent(eventData)
  }

  private async executeDatadogLog(event: any, scenario: any) {
    const client = new DatadogLogsClient(this.settings.datadog)
    
    const trackingTags = [
      `scenario_id:${scenario.id}`,
      `scenario_name:${scenario.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      `execution_run_id:${this.executionRunId}`,
      `event_id:${event.id}`,
      'source:synthetic-events'
    ]
    
    const logData = {
      id: event.id,
      type: event.type,
      message: event.message,
      tags: [...(event.tags || []), ...trackingTags],
      ddsource: event.ddsource || 'synthetic-events',
      ddtags: event.ddtags,
      hostname: event.hostname || 'synthetic-events-host',
      service: event.service || 'synthetic-events',
      delay: event.delay
    }

    return await client.sendLog(logData)
  }

  private async executeEmail(event: any, scenario: any) {
    console.log(`[ScenarioExecutor] Starting email execution for event ${event.id}`)
    
    // Validate email configuration
    if (!this.settings.aws) {
      throw new Error('AWS configuration not found')
    }
    
    if (!this.settings.aws.fromEmail) {
      throw new Error('AWS fromEmail not configured')
    }
    
    if (!this.settings.datadog.emailAddress) {
      throw new Error('Datadog emailAddress not configured')
    }
    
    // Validate email event data
    if (!event.subject) {
      throw new Error('Email subject is required')
    }
    
    if (!event.messageBody) {
      throw new Error('Email message body is required')
    }
    
    const client = new SESClient(this.settings.aws)
    
    const trackingTags = [
      `scenario_id:${scenario.id}`,
      `scenario_name:${scenario.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      `execution_run_id:${this.executionRunId}`,
      `event_id:${event.id}`,
      'source:synthetic-events'
    ]
    
    // Format the message body
    let formattedMessageBody = event.messageBody
    
    if ((event.format || "plain-text") === "json") {
      try {
        const jsonData = JSON.parse(event.messageBody)
        const enhancedJsonData = {
          ...jsonData,
          tags: [...(jsonData.tags || []), ...trackingTags],
          scenario_name: scenario.name,
          scenario_id: scenario.id,
          execution_run_id: this.executionRunId,
          event_id: event.id,
          original_from: event.from,
          original_to: event.to
        }
        formattedMessageBody = JSON.stringify(enhancedJsonData, null, 2)
      } catch (error) {
        console.warn(`[ScenarioExecutor] JSON parsing failed for email ${event.id}, using plain text`)
        formattedMessageBody = `[JSON Parse Error - treating as plain text]\n\n${event.messageBody}\n\n--- Execution Tracking ---\nScenario: ${scenario.name}\nScenario ID: ${scenario.id}\nExecution Run ID: ${this.executionRunId}\nEvent ID: ${event.id}`
      }
    } else {
      const hashtagTags = trackingTags.map(tag => `#${tag.replace(':', ':')}`).join(' ')
      formattedMessageBody = `${event.messageBody}\n\n${hashtagTags}\n\n--- Execution Tracking ---\nScenario: ${scenario.name}\nScenario ID: ${scenario.id}\nExecution Run ID: ${this.executionRunId}\nEvent ID: ${event.id}`
    }

    const emailData = {
      id: event.id,
      type: event.type,
      from: this.settings.aws.fromEmail,
      to: this.settings.datadog.emailAddress,
      subject: `${event.subject} [Scenario: ${scenario.name}]`,
      messageBody: formattedMessageBody,
      format: event.format || "plain-text",
      tags: [...(event.tags || []), ...trackingTags],
      delay: event.delay
    }

    console.log(`[ScenarioExecutor] Sending email from ${emailData.from} to ${emailData.to}`)
    
    try {
      const result = await client.sendEmail(emailData)
      console.log(`[ScenarioExecutor] Email sent successfully for event ${event.id}:`, result)
      return result
    } catch (error) {
      console.error(`[ScenarioExecutor] Email sending failed for event ${event.id}:`, error)
      throw error
    }
  }
}

// Export function for batch execution
export async function executeScenarioInBatch(scenario: any, executionRunId: string, settings: any): Promise<void> {
  const executor = new ScenarioExecutor(settings, executionRunId)
  await executor.executeScenario(scenario)
}