import { NextRequest, NextResponse } from "next/server"
import { loadScenarios, saveScenarios, getScenario, updateScenario, deleteScenario } from "@/lib/storage/scenarios"
import { AlertScenario } from "@/types/events"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenario = await getScenario(params.id)

    if (!scenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(scenario)
  } catch (error) {
    console.error("Error fetching scenario:", error)
    return NextResponse.json(
      { error: "Failed to fetch scenario" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updatedData: Partial<AlertScenario> = await request.json()
    
    const updatedScenario = await updateScenario(params.id, updatedData)

    if (!updatedScenario) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedScenario)
  } catch (error) {
    console.error("Error updating scenario:", error)
    return NextResponse.json(
      { error: "Failed to update scenario" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteScenario(params.id)

    if (!success) {
      return NextResponse.json(
        { error: "Scenario not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting scenario:", error)
    return NextResponse.json(
      { error: "Failed to delete scenario" },
      { status: 500 }
    )
  }
}