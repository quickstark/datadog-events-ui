import { AlertScenario } from '@/types/events'
import { readJsonFile, writeJsonFile } from './base'

const SCENARIOS_FILE = 'scenarios.json'

export async function loadScenarios(): Promise<AlertScenario[]> {
  try {
    const scenarios = await readJsonFile<AlertScenario[]>(SCENARIOS_FILE)
    console.log('Storage: Loaded scenarios from file:', scenarios)
    return scenarios || []
  } catch (error) {
    console.error('Storage: Error loading scenarios:', error)
    return []
  }
}

export const getAllScenarios = loadScenarios

export async function saveScenarios(scenarios: AlertScenario[]): Promise<void> {
  await writeJsonFile(SCENARIOS_FILE, scenarios)
}

export async function getScenario(id: string): Promise<AlertScenario | null> {
  const scenarios = await loadScenarios()
  return scenarios.find(s => s.id === id) || null
}

export async function createScenario(scenario: Omit<AlertScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertScenario> {
  console.log('Storage: Creating scenario with data:', scenario)
  const scenarios = await loadScenarios()
  console.log('Storage: Current scenarios count:', scenarios.length)
  
  const newScenario: AlertScenario = {
    ...scenario,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  console.log('Storage: New scenario created:', newScenario)
  
  scenarios.push(newScenario)
  console.log('Storage: Total scenarios after adding:', scenarios.length)
  await saveScenarios(scenarios)
  console.log('Storage: Scenarios saved to file')
  return newScenario
}

export async function updateScenario(id: string, updates: Partial<AlertScenario>): Promise<AlertScenario | null> {
  const scenarios = await loadScenarios()
  const index = scenarios.findIndex(s => s.id === id)
  
  if (index === -1) {
    return null
  }
  
  scenarios[index] = {
    ...scenarios[index],
    ...updates,
    updatedAt: new Date(),
  }
  
  await saveScenarios(scenarios)
  return scenarios[index]
}

export async function deleteScenario(id: string): Promise<boolean> {
  const scenarios = await loadScenarios()
  const index = scenarios.findIndex(s => s.id === id)
  
  if (index === -1) {
    return false
  }
  
  scenarios.splice(index, 1)
  await saveScenarios(scenarios)
  return true
}

export async function importScenarios(newScenarios: AlertScenario[], merge: boolean = true): Promise<AlertScenario[]> {
  if (!merge) {
    await saveScenarios(newScenarios)
    return newScenarios
  }
  
  const existingScenarios = await loadScenarios()
  const mergedScenarios = [...existingScenarios]
  
  for (const newScenario of newScenarios) {
    const existingIndex = mergedScenarios.findIndex(s => s.id === newScenario.id)
    if (existingIndex >= 0) {
      mergedScenarios[existingIndex] = {
        ...newScenario,
        updatedAt: new Date(),
      }
    } else {
      mergedScenarios.push({
        ...newScenario,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }
  }
  
  await saveScenarios(mergedScenarios)
  return mergedScenarios
}

// Batch tag operations
export interface BatchTagOperation {
  scenarioIds: string[]
  operation: 'add' | 'remove' | 'replace'
  tags: string[]
}

export interface BatchTagResult {
  success: boolean
  updatedScenarios: AlertScenario[]
  errors: Array<{ scenarioId: string; error: string }>
}

export async function batchUpdateTags(operation: BatchTagOperation): Promise<BatchTagResult> {
  console.log('Storage: Performing batch tag operation:', operation)
  
  const scenarios = await loadScenarios()
  const result: BatchTagResult = {
    success: true,
    updatedScenarios: [],
    errors: []
  }
  
  // Find scenarios to update
  const scenariosToUpdate = scenarios.filter(s => operation.scenarioIds.includes(s.id))
  const missingIds = operation.scenarioIds.filter(id => !scenarios.find(s => s.id === id))
  
  // Record errors for missing scenarios
  missingIds.forEach(id => {
    result.errors.push({ scenarioId: id, error: 'Scenario not found' })
    result.success = false
  })
  
  // Update found scenarios
  for (const scenario of scenariosToUpdate) {
    try {
      // Apply tags to both scenario level and event level
      // First get current tags from events (like dashboard does)
      const currentEventTags = new Set<string>()
      scenario.events.forEach((event) => {
        event.tags.forEach((tag) => currentEventTags.add(tag))
      })
      scenario.tags.forEach((tag) => currentEventTags.add(tag))
      
      let newTags: string[]
      
      switch (operation.operation) {
        case 'add':
          // Add new tags, avoiding duplicates
          newTags = Array.from(new Set([...Array.from(currentEventTags), ...operation.tags]))
          break
        case 'remove':
          // Remove specified tags
          newTags = Array.from(currentEventTags).filter(tag => !operation.tags.includes(tag))
          break
        case 'replace':
          // Replace all tags with new ones
          newTags = [...operation.tags]
          break
        default:
          throw new Error(`Unknown operation: ${operation.operation}`)
      }
      
      // Update scenario-level tags
      const updatedScenario = {
        ...scenario,
        tags: newTags,
        // Also update event tags to match the new tag set
        events: scenario.events.map(event => ({
          ...event,
          tags: newTags
        })),
        updatedAt: new Date()
      }
      
      result.updatedScenarios.push(updatedScenario)
      
    } catch (error) {
      result.errors.push({
        scenarioId: scenario.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      result.success = false
    }
  }
  
  // Save updated scenarios if there were any successful updates
  if (result.updatedScenarios.length > 0) {
    // Update the scenarios array with the new data
    const updatedScenariosMap = new Map(result.updatedScenarios.map(s => [s.id, s]))
    const finalScenarios = scenarios.map(s => updatedScenariosMap.get(s.id) || s)
    
    await saveScenarios(finalScenarios)
    console.log(`Storage: Successfully updated ${result.updatedScenarios.length} scenarios`)
  }
  
  return result
}

export async function getScenarioTags(scenarioIds?: string[]): Promise<{
  commonTags: string[]
  allTags: string[]
  tagCounts: Record<string, number>
}> {
  const scenarios = await loadScenarios()
  
  // Filter scenarios if specific IDs provided
  const targetScenarios = scenarioIds 
    ? scenarios.filter(s => scenarioIds.includes(s.id))
    : scenarios
  
  if (targetScenarios.length === 0) {
    return { commonTags: [], allTags: [], tagCounts: {} }
  }
  
  // Extract tags from events within each scenario (like dashboard does)
  const extractTagsFromScenario = (scenario: AlertScenario): string[] => {
    const tags = new Set<string>()
    scenario.events.forEach((event) => {
      event.tags.forEach((tag) => tags.add(tag))
    })
    // Also include scenario-level tags if they exist
    scenario.tags.forEach((tag) => tags.add(tag))
    return Array.from(tags)
  }
  
  // Get tags for each scenario
  const scenarioTagSets = targetScenarios.map(scenario => ({
    scenario,
    tags: extractTagsFromScenario(scenario)
  }))
  
  // Count tag occurrences across scenarios
  const tagCounts: Record<string, number> = {}
  const allTagsSet = new Set<string>()
  
  scenarioTagSets.forEach(({ tags }) => {
    const uniqueTagsInScenario = new Set(tags) // Avoid double-counting within same scenario
    uniqueTagsInScenario.forEach(tag => {
      allTagsSet.add(tag)
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })
  
  const allTags = Array.from(allTagsSet).sort()
  
  // Find common tags (present in all selected scenarios)
  const commonTags = allTags.filter(tag => tagCounts[tag] === targetScenarios.length)
  
  return {
    commonTags,
    allTags,
    tagCounts
  }
}