import { NextRequest, NextResponse } from "next/server"
import { importScenarios } from "@/lib/storage/scenarios"
import { AlertScenario } from "@/types/events"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle both direct array and wrapped format
    let scenarios: AlertScenario[]
    if (Array.isArray(body)) {
      scenarios = body
    } else if (body.scenarios && Array.isArray(body.scenarios)) {
      scenarios = body.scenarios
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid format",
          message: "Expected array of scenarios or object with 'scenarios' property"
        },
        { status: 400 }
      )
    }

    // Validate scenarios structure
    for (const scenario of scenarios) {
      if (!scenario.name || !Array.isArray(scenario.events)) {
        return NextResponse.json(
          { 
            success: false,
            error: "Invalid scenario format",
            message: "Each scenario must have a name and events array"
          },
          { status: 400 }
        )
      }
    }

    // Import with merge option (default: true)
    const { searchParams } = new URL(request.url)
    const merge = searchParams.get('merge') !== 'false'
    
    const importedScenarios = await importScenarios(scenarios, merge)
    
    return NextResponse.json({
      success: true,
      data: importedScenarios,
      message: `Successfully imported ${scenarios.length} scenarios`
    })
  } catch (error) {
    console.error("Error importing scenarios:", error)
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to import scenarios",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}