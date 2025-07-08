// Hybrid in-memory + file-based store for tracking execution progress
// Uses file system as backup since Next.js doesn't guarantee memory persistence

import { readJsonFile, writeJsonFile } from './storage/base'

interface EventProgress {
  eventId: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  delay: number
  executionOrder?: number // Add sequence number for proper ordering
  startedAt?: string
  completedAt?: string
  error?: string
}

interface ScenarioProgress {
  scenarioId: string
  scenarioName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  events: EventProgress[]
  startedAt?: string
  completedAt?: string
}

interface ExecutionProgress {
  executionId: string
  scenarios: ScenarioProgress[]
  totalScenarios: number
  completedScenarios: number
  startedAt: string
  completedAt?: string
}

// Store execution progress in memory with file backup
const executionStore = new Map<string, ExecutionProgress>()
const ACTIVE_EXECUTIONS_FILE = 'active-executions.json'

// Debounced file save to prevent excessive I/O
let saveTimeout: NodeJS.Timeout | null = null
let pendingSave = false

// Load active executions from file on module load
let isLoading = false
async function loadActiveExecutions() {
  if (isLoading) return // Prevent concurrent loads
  isLoading = true
  
  try {
    const executions = await readJsonFile<Record<string, ExecutionProgress>>(ACTIVE_EXECUTIONS_FILE)
    if (executions) {
      // Clear existing store and reload from file
      executionStore.clear()
      Object.entries(executions).forEach(([id, progress]) => {
        // Only load active executions (not completed ones)
        if (!progress.completedAt) {
          executionStore.set(id, progress)
        }
      })
      console.log(`[ExecutionTracker] Loaded ${executionStore.size} active executions from file`)
    }
  } catch (error) {
    console.log('[ExecutionTracker] No active executions file found, starting fresh')
  } finally {
    isLoading = false
  }
}

// Save active executions to file with debouncing
async function saveActiveExecutions(immediate = false) {
  if (!immediate && saveTimeout) {
    pendingSave = true
    return // Already scheduled
  }
  
  const performSave = async () => {
    try {
      const executions: Record<string, ExecutionProgress> = {}
      executionStore.forEach((progress, id) => {
        // Only save active executions (not completed ones)
        if (!progress.completedAt) {
          executions[id] = progress
        }
      })
      await writeJsonFile(ACTIVE_EXECUTIONS_FILE, executions)
      pendingSave = false
      console.log(`[ExecutionTracker] Successfully saved ${Object.keys(executions).length} active executions`)
    } catch (error) {
      console.error('[ExecutionTracker] Failed to save active executions:', error)
      // Retry once more if save fails
      try {
        const retryExecutions: Record<string, ExecutionProgress> = {}
        executionStore.forEach((progress, id) => {
          if (!progress.completedAt) {
            retryExecutions[id] = progress
          }
        })
        await writeJsonFile(ACTIVE_EXECUTIONS_FILE, retryExecutions)
        pendingSave = false
        console.log(`[ExecutionTracker] Successfully saved on retry`)
      } catch (retryError) {
        console.error('[ExecutionTracker] Failed to save on retry:', retryError)
      }
    }
  }
  
  if (immediate) {
    await performSave()
  } else {
    // Debounce saves to reduce file I/O
    saveTimeout = setTimeout(async () => {
      await performSave()
      saveTimeout = null
      if (pendingSave) {
        // If there were more saves requested, schedule another one
        pendingSave = false
        saveActiveExecutions()
      }
    }, 1000) // Wait 1 second before saving
  }
}

// Initialize on module load
loadActiveExecutions().catch(console.error)

export function createExecution(executionId: string, scenarios: { id: string; name: string; events: any[] }[]): void {
  const progress: ExecutionProgress = {
    executionId,
    scenarios: scenarios.map(scenario => ({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      status: 'pending',
      events: scenario.events.map((event, index) => ({
        eventId: event.id,
        type: event.type,
        status: 'pending',
        delay: event.delay || 0,
        executionOrder: index + 1 // Add sequence number for proper ordering
      }))
    })),
    totalScenarios: scenarios.length,
    completedScenarios: 0,
    startedAt: new Date().toISOString()
  }
  
  executionStore.set(executionId, progress)
  console.log(`[ExecutionTracker] Created execution: ${executionId}, scenarios: ${scenarios.length}`)
  
  // Save to file with debouncing
  saveActiveExecutions()
  
  // Clean up after completion, not time-based
  // The cleanup will happen when execution is marked as completed
}

export function updateScenarioStatus(
  executionId: string, 
  scenarioId: string, 
  status: 'pending' | 'running' | 'completed' | 'failed'
): void {
  const progress = executionStore.get(executionId)
  if (!progress) return
  
  const scenario = progress.scenarios.find(s => s.scenarioId === scenarioId)
  if (!scenario) return
  
  scenario.status = status
  
  if (status === 'running') {
    scenario.startedAt = new Date().toISOString()
  } else if (status === 'completed' || status === 'failed') {
    scenario.completedAt = new Date().toISOString()
    progress.completedScenarios++
    
    if (progress.completedScenarios === progress.totalScenarios) {
      progress.completedAt = new Date().toISOString()
      // Clean up completed execution immediately
      setTimeout(() => {
        executionStore.delete(executionId)
        saveActiveExecutions(true) // Immediate save for cleanup
        console.log(`[ExecutionTracker] Cleaned up completed execution: ${executionId}`)
      }, 5000) // Clean up after 5 seconds
    }
  }
  
  // Save to file with debouncing
  saveActiveExecutions()
}

export function updateEventStatus(
  executionId: string,
  scenarioId: string,
  eventId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  error?: string
): boolean {
  console.log(`[ExecutionTracker] Updating event ${eventId} status to ${status}`)
  
  const progress = executionStore.get(executionId)
  if (!progress) {
    console.error(`[ExecutionTracker] Execution ${executionId} not found in store`)
    return false
  }
  
  const scenario = progress.scenarios.find(s => s.scenarioId === scenarioId)
  if (!scenario) {
    console.error(`[ExecutionTracker] Scenario ${scenarioId} not found in execution ${executionId}`)
    return false
  }
  
  const event = scenario.events.find(e => e.eventId === eventId)
  if (!event) {
    console.error(`[ExecutionTracker] Event ${eventId} not found in scenario ${scenarioId}`)
    return false
  }
  
  const oldStatus = event.status
  event.status = status
  if (error) event.error = error
  
  if (status === 'running') {
    event.startedAt = new Date().toISOString()
  } else if (status === 'completed' || status === 'failed') {
    event.completedAt = new Date().toISOString()
  }
  
  console.log(`[ExecutionTracker] Event ${eventId} status updated from ${oldStatus} to ${status}`)
  
  // For critical status updates (completed/failed), save immediately
  if (status === 'completed' || status === 'failed') {
    console.log(`[ExecutionTracker] Saving execution immediately for critical status: ${status}`)
    saveActiveExecutions(true).catch(error => {
      console.error(`[ExecutionTracker] Failed to save execution immediately:`, error)
    })
  } else {
    // Save to file with debouncing for non-critical updates
    saveActiveExecutions()
  }
  
  return true
}

export async function getExecutionProgress(executionId: string): Promise<ExecutionProgress | null> {
  let progress = executionStore.get(executionId)
  
  // If not in memory, try to load from file (only once)
  if (!progress) {
    console.log(`[ExecutionTracker] Execution ${executionId} not in memory, reloading from file...`)
    await loadActiveExecutions()
    progress = executionStore.get(executionId)
  }
  
  return progress || null
}

export function clearExecution(executionId: string): void {
  executionStore.delete(executionId)
}

// Function to detect and fix stuck executions
export function fixStuckExecution(executionId: string): boolean {
  console.log(`[ExecutionTracker] Checking for stuck events in execution ${executionId}`)
  
  const progress = executionStore.get(executionId)
  if (!progress) {
    console.log(`[ExecutionTracker] Execution ${executionId} not found`)
    return false
  }
  
  const now = new Date()
  let hasStuckEvents = false
  
  progress.scenarios.forEach(scenario => {
    scenario.events.forEach(event => {
      // Check if event has been running for too long (more than 2 minutes)
      if (event.status === 'running' && event.startedAt) {
        const startTime = new Date(event.startedAt)
        const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60)
        
        if (elapsedMinutes > 2) {
          console.warn(`[ExecutionTracker] Event ${event.eventId} has been running for ${elapsedMinutes.toFixed(1)} minutes, marking as failed`)
          event.status = 'failed'
          event.completedAt = now.toISOString()
          event.error = `Event timed out after running for ${elapsedMinutes.toFixed(1)} minutes`
          hasStuckEvents = true
        }
      }
    })
  })
  
  if (hasStuckEvents) {
    console.log(`[ExecutionTracker] Fixed stuck events in execution ${executionId}, saving immediately`)
    saveActiveExecutions(true).catch(error => {
      console.error(`[ExecutionTracker] Failed to save after fixing stuck events:`, error)
    })
  }
  
  return hasStuckEvents
}