import { NextRequest, NextResponse } from 'next/server'
import { loadAllExecutionHistory } from '@/lib/storage/execution-history'

export async function GET() {
  try {
    const history = await loadAllExecutionHistory()
    
    // Sort by timestamp descending (most recent first)
    const sortedHistory = history.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    return NextResponse.json({
      success: true,
      history: sortedHistory
    })
  } catch (error) {
    console.error('Error loading execution history:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load execution history',
        history: []
      },
      { status: 500 }
    )
  }
}