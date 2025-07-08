import { NextRequest, NextResponse } from "next/server"
import { getScenario } from "@/lib/storage/scenarios"
import { loadSettings } from "@/lib/storage/settings"
import { createExecution } from "@/lib/execution-tracker"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Generate unique execution run ID
  const executionRunId = crypto.randomUUID()
  
  try {
    const scenario = await getScenario(params.id)

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      )
    }

    if (scenario.events.length === 0) {
      return NextResponse.json(
        { error: "Scenario has no events to execute" },
        { status: 400 }
      )
    }

    console.log(`Starting execution of scenario: ${scenario.name} (${scenario.id}) with run ID: ${executionRunId}`)
    
    // Initialize execution tracking
    createExecution(executionRunId, [{
      id: scenario.id,
      name: scenario.name,
      events: scenario.events
    }])

    // Load settings and validate credentials
    const settings = await loadSettings()
    console.log('Loaded settings for execution:', {
      datadog: {
        apiKeyPresent: !!settings.datadog.apiKey,
        appKeyPresent: !!settings.datadog.appKey,
        site: settings.datadog.site,
        emailAddressPresent: !!settings.datadog.emailAddress
      },
      aws: {
        accessKeyIdPresent: !!settings.aws.accessKeyId,
        secretAccessKeyPresent: !!settings.aws.secretAccessKey,
        sesRegion: settings.aws.sesRegion,
        fromEmailPresent: !!settings.aws.fromEmail
      }
    })
    
    // Check which services are needed by this scenario
    const hasDatadogEvents = scenario.events.some(e => e.type === 'datadog-event')
    const hasDatadogLogs = scenario.events.some(e => e.type === 'datadog-log')
    const hasEmailEvents = scenario.events.some(e => e.type === 'email')
    
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

    // Start execution in background and return immediately
    executeScenarioAsync(scenario, executionRunId, settings)
    
    // Return immediately with execution ID so user can navigate to progress page
    return NextResponse.json({
      success: true,
      message: "Execution started",
      executionRunId,
      scenarioId: params.id,
      scenarioName: scenario.name
    })

  } catch (error) {
    console.error("Error starting scenario execution:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to start scenario execution",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// Async function to execute scenario in background
async function executeScenarioAsync(
  scenario: any, 
  executionRunId: string, 
  settings: any
) {
  console.log(`[AsyncExecution] Starting async execution for ${executionRunId}`)
  
  try {
    // Use the shared scenario executor
    const { executeScenarioInBatch } = await import('@/lib/scenario-executor')
    await executeScenarioInBatch(scenario, executionRunId, settings)
    
    console.log(`[AsyncExecution] Single scenario execution completed for ${executionRunId}`)
    
  } catch (error) {
    console.error(`[AsyncExecution] Error in single scenario execution ${executionRunId}:`, error)
  }
}

