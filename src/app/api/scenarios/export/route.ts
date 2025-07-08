import { NextRequest, NextResponse } from "next/server"
import { loadScenarios } from "@/lib/storage/scenarios"

// Mark route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get('ids')?.split(',') || []
    
    const allScenarios = await loadScenarios()
    
    // If specific IDs requested, filter; otherwise export all
    const scenariosToExport = ids.length > 0 
      ? allScenarios.filter(s => ids.includes(s.id))
      : allScenarios

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      scenarios: scenariosToExport
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="scenarios-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    console.error("Error exporting scenarios:", error)
    return NextResponse.json(
      { error: "Failed to export scenarios" },
      { status: 500 }
    )
  }
}