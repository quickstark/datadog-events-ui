import { NextRequest, NextResponse } from "next/server"
import { getScenario } from "@/lib/storage/scenarios"
import { loadSettings } from "@/lib/storage/settings"
import { createExecution } from "@/lib/execution-tracker"

export async function POST(request: NextRequest) {
  try {
    const { scenarioIds, executionId } = await request.json()
    
    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid scenario IDs provided" },
        { status: 400 }
      )
    }

    // Use provided execution ID or generate a new one
    const executionRunId = executionId || crypto.randomUUID()
    
    // Load all scenarios
    const scenarios = await Promise.all(
      scenarioIds.map(async (id) => {
        const scenario = await getScenario(id)
        if (!scenario) {
          throw new Error(`Scenario ${id} not found`)
        }
        if (scenario.events.length === 0) {
          throw new Error(`Scenario ${scenario.name} has no events to execute`)
        }
        return scenario
      })
    )

    console.log(`Starting batch execution of ${scenarios.length} scenarios with run ID: ${executionRunId}`)
    
    // Load settings and validate credentials
    const settings = await loadSettings()
    
    // Check which services are needed across all scenarios
    const allEvents = scenarios.flatMap(s => s.events)
    const hasDatadogEvents = allEvents.some(e => e.type === 'datadog-event')
    const hasDatadogLogs = allEvents.some(e => e.type === 'datadog-log')
    const hasEmailEvents = allEvents.some(e => e.type === 'email')
    
    // Validate required credentials
    const missingCredentials = []
    
    if (hasDatadogEvents || hasDatadogLogs) {
      if (!settings.datadog.apiKey?.trim()) {
        missingCredentials.push('Datadog API Key')
      }
      if (!settings.datadog.appKey?.trim()) {
        missingCredentials.push('Datadog Application Key')
      }
    }
    
    if (hasEmailEvents) {
      if (!settings.aws.accessKeyId?.trim()) {
        missingCredentials.push('AWS Access Key ID')
      }
      if (!settings.aws.secretAccessKey?.trim()) {
        missingCredentials.push('AWS Secret Access Key')
      }
      if (!settings.aws.fromEmail?.trim()) {
        missingCredentials.push('AWS SES From Email')
      }
      if (!settings.datadog.emailAddress?.trim()) {
        missingCredentials.push('Datadog Email Address')
      }
    }
    
    if (missingCredentials.length > 0) {
      return NextResponse.json(
        { 
          error: "Missing required credentials",
          message: `Please configure the following in Settings: ${missingCredentials.join(', ')}`,
          missingCredentials
        },
        { status: 400 }
      )
    }

    // Initialize execution tracking with all scenarios
    createExecution(executionRunId, scenarios.map(scenario => ({
      id: scenario.id,
      name: scenario.name,
      events: scenario.events
    })))

    // Small delay to ensure execution tracker is properly initialized
    await new Promise(resolve => setTimeout(resolve, 100))

    // Start execution in background and return immediately
    executeBatchAsync(scenarios, executionRunId, settings)
    
    // Return immediately with execution ID so user can navigate to progress page
    return NextResponse.json({
      success: true,
      message: "Batch execution started",
      executionRunId,
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        eventCount: s.events.length
      }))
    })

  } catch (error) {
    console.error("Error starting batch execution:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start batch execution",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// Import the execution functions from the single scenario route
// We'll create a shared execution module for this
async function executeBatchAsync(scenarios: any[], executionRunId: string, settings: any) {
  console.log(`[BatchExecution] Starting batch execution for ${executionRunId}`)
  
  // Import execution functions dynamically to avoid circular dependencies
  const { executeScenarioInBatch } = await import('@/lib/scenario-executor')
  
  try {
    // Execute scenarios in parallel for better performance
    const results = await Promise.allSettled(
      scenarios.map(scenario => 
        executeScenarioInBatch(scenario, executionRunId, settings)
      )
    )
    
    // Log results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`[BatchExecution] Scenario ${scenarios[index].name} completed successfully`)
      } else {
        console.error(`[BatchExecution] Scenario ${scenarios[index].name} failed:`, result.reason)
      }
    })
    
    console.log(`[BatchExecution] Batch execution ${executionRunId} completed`)
    
  } catch (error) {
    console.error(`[BatchExecution] Error in batch execution ${executionRunId}:`, error)
  }
}