import { NextRequest, NextResponse } from 'next/server'
import { loadScenarios, createScenario } from '@/lib/storage/scenarios'
import { AlertScenario } from '@/types/events'

export async function GET() {
  try {
    const scenarios = await loadScenarios()
    console.log('API: Loading scenarios, found:', scenarios.length)
    console.log('API: Scenarios data:', scenarios)
    return NextResponse.json({
      success: true,
      data: scenarios,
    })
  } catch (error) {
    console.error('Error loading scenarios:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load scenarios',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('API: Creating scenario with body:', body)
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Scenario name is required',
        },
        { status: 400 }
      )
    }

    const scenarioData: Omit<AlertScenario, 'id' | 'createdAt' | 'updatedAt'> = {
      name: body.name,
      description: body.description || '',
      events: body.events || [],
      status: (body.status as "draft" | "pending" | "completed") || 'draft',
      tags: body.tags || [],
    }
    console.log('API: Scenario data to create:', scenarioData)

    const newScenario = await createScenario(scenarioData)
    console.log('API: Created scenario:', newScenario)
    
    return NextResponse.json({
      success: true,
      data: newScenario,
      message: 'Scenario created successfully',
    })
  } catch (error) {
    console.error('Error creating scenario:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}