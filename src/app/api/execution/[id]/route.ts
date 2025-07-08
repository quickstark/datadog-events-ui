import { NextRequest, NextResponse } from 'next/server'
import { loadExecutionRun } from '@/lib/storage/execution-history'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const execution = await loadExecutionRun(params.id)
    
    if (!execution) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Execution not found' 
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      execution
    })
  } catch (error) {
    console.error('Error loading execution details:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load execution details'
      },
      { status: 500 }
    )
  }
}