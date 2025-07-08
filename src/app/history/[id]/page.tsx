"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, History, CheckCircle, XCircle, Calendar, Timer, FileText } from "lucide-react"

interface ExecutionEvent {
  id: string
  type: string
  status: 'success' | 'error'
  delay: number
  executedAt: string
  message?: string
  error?: string
}

interface ExecutionRun {
  id: string
  scenarioId: string
  scenarioName: string
  timestamp: string
  status: 'completed' | 'failed'
  duration: number
  events: ExecutionEvent[]
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export default function ExecutionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const executionId = params.id as string
  
  const [execution, setExecution] = useState<ExecutionRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (executionId) {
      loadExecutionDetail()
    }
  }, [executionId])
  
  const loadExecutionDetail = async () => {
    try {
      const response = await fetch(`/api/execution/${executionId}`)
      if (!response.ok) {
        throw new Error('Failed to load execution details')
      }
      const data = await response.json()
      setExecution(data.execution)
    } catch (err) {
      console.error('Error loading execution detail:', err)
      setError(err instanceof Error ? err.message : 'Failed to load execution details')
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true
    }).format(date)
  }
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading execution details...</div>
      </div>
    )
  }
  
  if (error || !execution) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">Error</h3>
                  <p className="text-red-700">{error || 'Execution not found'}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push('/history')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/history')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h1 className="text-xl font-semibold">Execution Details</h1>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Run ID: {executionId.slice(0, 8)}...
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{execution.scenarioName}</CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(execution.timestamp)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    Duration: {formatDuration(execution.duration)}
                  </div>
                </div>
              </div>
              <Badge
                className={
                  execution.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }
              >
                {execution.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{execution.summary.total}</div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{execution.summary.successful}</div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{execution.summary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle>Event Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {execution.events.map((event) => (
              <div key={event.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {event.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <span className="font-mono font-medium">{event.type}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {event.delay}s delay
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDate(event.executedAt)}
                  </div>
                </div>
                
                {(event.message || event.error) && (
                  <div className={`mt-2 p-3 rounded text-sm ${
                    event.status === 'success' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        {event.error || event.message}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => router.push('/history')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <Button onClick={() => router.push(`/scenarios/${execution.scenarioId}`)}>
            View Scenario
          </Button>
        </div>
      </div>
    </div>
  )
}