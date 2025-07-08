import { readJsonFile, writeJsonFile } from './base'

export interface ExecutionRun {
  id: string
  scenarioId: string
  scenarioName: string
  timestamp: string
  status: 'completed' | 'failed'
  duration: number // in seconds
  events: Array<{
    id: string
    type: string
    status: 'success' | 'error'
    delay: number
    executedAt: string
    message: string
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

const EXECUTION_HISTORY_FILE = 'execution-history.json'

export async function getExecutionHistory(): Promise<ExecutionRun[]> {
  const history = await readJsonFile<ExecutionRun[]>(EXECUTION_HISTORY_FILE)
  return history || []
}

export async function saveExecutionRun(run: ExecutionRun): Promise<void> {
  const history = await getExecutionHistory()
  history.unshift(run) // Add to beginning (most recent first)
  
  // Keep only last 100 runs to prevent file from growing too large
  const trimmedHistory = history.slice(0, 100)
  
  await writeJsonFile(EXECUTION_HISTORY_FILE, trimmedHistory)
}

export async function getScenarioExecutionHistory(scenarioId: string): Promise<ExecutionRun[]> {
  const history = await getExecutionHistory()
  return history.filter(run => run.scenarioId === scenarioId)
}

export async function getLatestExecutionRun(scenarioId: string): Promise<ExecutionRun | null> {
  const scenarioHistory = await getScenarioExecutionHistory(scenarioId)
  return scenarioHistory.length > 0 ? scenarioHistory[0] : null
}

export async function loadAllExecutionHistory(): Promise<ExecutionRun[]> {
  return getExecutionHistory()
}

export async function loadExecutionRun(runId: string): Promise<ExecutionRun | null> {
  const history = await getExecutionHistory()
  console.log(`[ExecutionHistory] Looking for execution ${runId} in ${history.length} records`)
  console.log(`[ExecutionHistory] Available IDs: ${history.slice(0, 5).map(h => h.id).join(', ')}`)
  const found = history.find(run => run.id === runId)
  console.log(`[ExecutionHistory] Found execution ${runId}: ${found ? 'yes' : 'no'}`)
  return found || null
}