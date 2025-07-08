"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

interface EventProgress {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  delay: number
  executedAt?: string
  message?: string
}

interface ScenarioProgress {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  events?: EventProgress[]
  error?: string
}

interface ExecutionProgress {
  scenarios: ScenarioProgress[]
  totalScenarios: number
  completedScenarios: number
}

export default function ExecutionProgressPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const executionId = params.id as string
  const scenarioIds = searchParams.get('scenarios')?.split(',') || []
  
  const [progress, setProgress] = useState<ExecutionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState("Loading execution progress...")
  const [isStartingExecution, setIsStartingExecution] = useState(false)
  
  useEffect(() => {
    if (!executionId) return
    
    let pollInterval: NodeJS.Timeout | null = null
    let isActive = true
    let pollDelay = 500
    
    const startExecution = async (scenarioIds: string[]) => {
      try {
        setIsStartingExecution(true)
        setLoadingMessage("Starting execution...")
        
        const response = await fetch('/api/scenarios/batch-execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenarioIds,
            executionId // Use the pre-generated execution ID
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to start execution')
        }
        
        setIsStartingExecution(false)
        setLoadingMessage("Execution started, loading progress...")
        
        return true
      } catch (error) {
        console.error('Error starting execution:', error)
        setError(error instanceof Error ? error.message : 'Failed to start execution')
        setLoading(false)
        setIsStartingExecution(false)
        return false
      }
    }
    
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/execution/${executionId}/progress`)
        
        if (!response.ok) {
          if (response.status === 404) {
            // Execution not found - try to start it if we have scenario IDs
            if (scenarioIds.length > 0 && !isStartingExecution) {
              console.log(`[ExecutionProgress] Execution ${executionId} not found, starting execution...`)
              const started = await startExecution(scenarioIds)
              if (started) {
                // Wait a moment then try fetching again
                setTimeout(fetchProgress, 1000)
              }
              return
            }
          }
          throw new Error('Failed to fetch execution progress')
        }
        
        const data = await response.json()
        if (data.progress && isActive) {
          const executionProgress = data.progress
          
          // Transform the progress data to match our component structure
          const transformedProgress: ExecutionProgress = {
            scenarios: executionProgress.scenarios.map((scenario: any) => ({
              id: scenario.scenarioId,
              name: scenario.scenarioName,
              status: scenario.status,
              events: scenario.events
                .map((event: any) => ({
                  id: event.eventId,
                  type: event.type,
                  status: event.status,
                  delay: event.delay,
                  executedAt: event.completedAt || event.startedAt,
                  message: event.error || (event.status === 'completed' ? 'Event executed successfully' : undefined),
                  executionOrder: event.executionOrder || 0
                }))
                .sort((a: any, b: any) => {
                  // Sort by delay (execution order) first
                  if (a.delay !== b.delay) {
                    return a.delay - b.delay;
                  }
                  // If delays are the same, sort by started time
                  if (a.executedAt && b.executedAt) {
                    return new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime();
                  }
                  // Fallback to execution order
                  return a.executionOrder - b.executionOrder;
                }),
              error: scenario.status === 'failed' ? 'Some events failed to execute' : undefined
            })),
            totalScenarios: executionProgress.totalScenarios,
            completedScenarios: executionProgress.completedScenarios
          }
          
          setProgress(transformedProgress)
          setLoading(false)
          setError(null)
          
          // Stop polling if execution is complete
          if (executionProgress.completedAt) {
            if (pollInterval) {
              clearTimeout(pollInterval)
              pollInterval = null
            }
          } else {
            // Slow down polling for long-running executions
            pollDelay = Math.min(pollDelay * 1.1, 2000)
          }
        }
      } catch (err) {
        console.error('Error fetching execution progress:', err)
        if (isActive && !isStartingExecution) {
          setError(err instanceof Error ? err.message : 'Failed to load execution progress')
          setLoading(false)
        }
      }
    }
    
    const schedulePoll = () => {
      pollInterval = setTimeout(() => {
        if (isActive && !isStartingExecution) {
          fetchProgress()
          schedulePoll()
        }
      }, pollDelay)
    }
    
    // Initial fetch
    fetchProgress()
    
    // Start polling
    schedulePoll()
    
    // Cleanup
    return () => {
      isActive = false
      if (pollInterval) {
        clearTimeout(pollInterval)
      }
    }
  }, [executionId, scenarioIds.join(',')])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{loadingMessage}</p>
          {scenarioIds.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              {scenarioIds.length} scenario{scenarioIds.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>
    )
  }
  
  if (error || !progress) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error Loading Execution</h3>
                  <p className="text-red-700">{error || 'Execution not found'}</p>
                  {scenarioIds.length === 0 && (
                    <p className="text-red-600 text-sm mt-1">
                      No scenario data available to start execution.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                    setLoadingMessage("Retrying...")
                    // Restart the effect
                    window.location.reload()
                  }}
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  const progressPercentage = Math.round((progress.completedScenarios / progress.totalScenarios) * 100)
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold">Scenario Execution Progress</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Execution ID: {executionId.slice(0, 8)}...
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Summary */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">
                Progress: {progress.completedScenarios} of {progress.totalScenarios} scenarios
              </span>
              <span className="text-sm text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Scenarios */}
        <div className="space-y-4">
          {progress.scenarios.map((scenario) => (
            <Card key={scenario.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {scenario.status === 'pending' && (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      {scenario.status === 'running' && (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                      {scenario.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {scenario.status === 'failed' && (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{scenario.name}</CardTitle>
                      {scenario.error && (
                        <p className="text-sm text-red-600 mt-1">{scenario.error}</p>
                      )}
                      {scenario.events && scenario.events.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          {scenario.events.filter(e => e.status === 'completed').length} / {scenario.events.length} events successful
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge 
                    className={
                      scenario.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      scenario.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      scenario.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }
                  >
                    {scenario.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              {/* Event Details */}
              {scenario.events && scenario.events.length > 0 && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Event Details:</h4>
                    <div className="space-y-3">
                      {scenario.events.map((event) => (
                        <div key={event.id} className="bg-gray-50 rounded-lg border p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {event.status === 'pending' && (
                                <Clock className="w-4 h-4 text-gray-400" />
                              )}
                              {event.status === 'running' && (
                                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                              )}
                              {event.status === 'completed' && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                              {event.status === 'failed' && (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className="font-mono text-sm font-medium">{event.type}</span>
                              <Badge variant="outline" className="text-xs">
                                {event.delay}s delay
                              </Badge>
                            </div>
                            <span className={`text-xs font-medium ${
                              event.status === 'pending' ? 'text-gray-600' :
                              event.status === 'running' ? 'text-blue-600' :
                              event.status === 'completed' ? 'text-green-600' : 
                              'text-red-600'
                            }`}>
                              {event.status.toUpperCase()}
                            </span>
                          </div>
                          {event.message && event.message !== 'Event executed successfully' && (
                            <div className={`text-xs p-2 rounded mt-2 ${
                              event.status === 'completed' ? 'bg-green-50 text-green-700' : 
                              event.status === 'failed' ? 'bg-red-50 text-red-700' :
                              event.status === 'running' ? 'bg-blue-50 text-blue-700' :
                              'bg-gray-50 text-gray-700'
                            }`}>
                              {event.message.length > 200 ? (
                                <details>
                                  <summary className="cursor-pointer hover:underline">
                                    {event.message.substring(0, 200)}... (click to expand)
                                  </summary>
                                  <div className="mt-2 whitespace-pre-wrap">{event.message}</div>
                                </details>
                              ) : (
                                <span className="whitespace-pre-wrap">{event.message}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
        
        {/* Completion Actions */}
        {progress.completedScenarios === progress.totalScenarios && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold">Execution Complete</h3>
                    <p className="text-sm text-gray-600">
                      All scenarios have finished executing
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => router.push('/history')}>
                    View History
                  </Button>
                  <Button onClick={() => router.push('/')}>
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}