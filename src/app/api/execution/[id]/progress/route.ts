import { NextRequest, NextResponse } from 'next/server'
import { getExecutionProgress, fixStuckExecution } from '@/lib/execution-tracker'
import { loadExecutionRun } from '@/lib/storage/execution-history'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First try to get from active execution tracker
    let progress = await getExecutionProgress(params.id)
    
    // Check for stuck executions and try to fix them
    if (progress) {
      const wasFixed = fixStuckExecution(params.id)
      if (wasFixed) {
        console.log(`[ProgressAPI] Fixed stuck events in execution ${params.id}, reloading progress`)
        // Reload progress after fixing
        progress = await getExecutionProgress(params.id)
      }
    }
    
    if (!progress) {
      // If not found in tracker, try to get from execution history
      console.log(`[ProgressAPI] Execution ${params.id} not found in tracker, checking history...`)
      const executionRun = await loadExecutionRun(params.id)
      
      if (executionRun) {
        // Convert execution history to progress format
        progress = {
          executionId: params.id,
          scenarios: [{
            scenarioId: executionRun.scenarioId,
            scenarioName: executionRun.scenarioName,
            status: executionRun.status === 'completed' ? 'completed' : 'failed',
            events: executionRun.events.map(event => ({
              eventId: event.id,
              type: event.type,
              status: event.status === 'success' ? 'completed' : 'failed',
              delay: event.delay,
              startedAt: event.executedAt,
              completedAt: event.executedAt,
              error: event.error
            })),
            startedAt: executionRun.timestamp,
            completedAt: executionRun.timestamp
          }],
          totalScenarios: 1,
          completedScenarios: 1,
          startedAt: executionRun.timestamp,
          completedAt: executionRun.timestamp
        }
        
        console.log(`[ProgressAPI] Found execution ${params.id} in history, converted to progress format`)
      } else {
        // Also check if there are multiple execution runs for this batch execution
        try {
          const { getExecutionHistory } = await import('@/lib/storage/execution-history')
          const history = await getExecutionHistory()
          
          // Look for execution runs that start with this execution ID (batch execution pattern)
          const batchRuns = history.filter(run => run.id.startsWith(params.id + '-'))
          
          if (batchRuns.length > 0) {
            console.log(`[ProgressAPI] Found ${batchRuns.length} batch execution runs for ${params.id}`)
            
            // Convert batch execution history to progress format
            progress = {
              executionId: params.id,
              scenarios: batchRuns.map(run => ({
                scenarioId: run.scenarioId,
                scenarioName: run.scenarioName,
                status: run.status === 'completed' ? 'completed' : 'failed',
                events: run.events.map(event => ({
                  eventId: event.id,
                  type: event.type,
                  status: event.status === 'success' ? 'completed' : 'failed',
                  delay: event.delay,
                  startedAt: event.executedAt,
                  completedAt: event.executedAt,
                  error: event.error
                })),
                startedAt: run.timestamp,
                completedAt: run.timestamp
              })),
              totalScenarios: batchRuns.length,
              completedScenarios: batchRuns.length,
              startedAt: Math.min(...batchRuns.map(r => new Date(r.timestamp).getTime())).toString(),
              completedAt: Math.max(...batchRuns.map(r => new Date(r.timestamp).getTime())).toString()
            }
            
            console.log(`[ProgressAPI] Converted batch execution history to progress format`)
          }
        } catch (historyError) {
          console.error(`[ProgressAPI] Error loading execution history for batch lookup:`, historyError)
        }
      }
    }
    
    if (!progress) {
      console.log(`[ProgressAPI] Execution ${params.id} not found in tracker or history`)
      return NextResponse.json(
        { 
          error: 'Execution not found',
          message: 'The execution may still be initializing. Please try again in a moment.',
          executionId: params.id
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      progress
    })
  } catch (error) {
    console.error('Error getting execution progress:', error)
    return NextResponse.json(
      { error: 'Failed to get execution progress' },
      { status: 500 }
    )
  }
}