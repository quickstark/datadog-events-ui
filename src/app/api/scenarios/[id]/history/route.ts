import { NextRequest, NextResponse } from "next/server"
import { getScenarioExecutionHistory } from "@/lib/storage/execution-history"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const history = await getScenarioExecutionHistory(params.id)
    
    return NextResponse.json({
      success: true,
      scenarioId: params.id,
      history
    })
  } catch (error) {
    console.error("Error fetching execution history:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch execution history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}