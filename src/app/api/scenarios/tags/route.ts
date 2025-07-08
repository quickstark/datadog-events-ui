import { NextRequest, NextResponse } from 'next/server'
import { getScenarioTags } from '@/lib/storage/scenarios'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')
    
    // Parse scenario IDs if provided
    let scenarioIds: string[] | undefined
    if (idsParam) {
      scenarioIds = idsParam.split(',').map(id => id.trim()).filter(Boolean)
      
      if (scenarioIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Invalid scenario IDs format',
          },
          { status: 400 }
        )
      }
    }
    
    console.log('API: Getting scenario tags for IDs:', scenarioIds)
    
    const tagsData = await getScenarioTags(scenarioIds)
    
    return NextResponse.json({
      success: true,
      data: {
        commonTags: tagsData.commonTags,
        allTags: tagsData.allTags,
        tagCounts: tagsData.tagCounts,
        selectedScenarios: scenarioIds?.length || 0,
        totalScenarios: Object.values(tagsData.tagCounts).length > 0 
          ? Math.max(...Object.values(tagsData.tagCounts)) 
          : 0
      },
      message: scenarioIds 
        ? `Found tags for ${scenarioIds.length} selected scenario(s)`
        : `Found tags across all scenarios`
    })
    
  } catch (error) {
    console.error('Error getting scenario tags:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scenario tags',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}