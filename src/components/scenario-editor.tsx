"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Save, Clock, ArrowRight, Trash2, CheckCircle, Wifi, Database, Zap, AlertTriangle, Server, Activity, Settings as SettingsIcon, ExternalLink, Play, Loader2, XCircle } from "lucide-react"
import { AlertScenario, EventType, DatadogEvent, DatadogLog, EmailEvent } from "@/types/events"
import { Settings } from "@/types/settings"
import { useToast } from "@/hooks/use-toast"

interface ScenarioEditorProps {
  scenario: AlertScenario
  onSave: (scenario: AlertScenario) => Promise<void>
  onCancel: () => void
}

export default function ScenarioEditor({ scenario: initialScenario, onSave, onCancel }: ScenarioEditorProps) {
  const router = useRouter()
  const [scenario, setScenario] = useState<AlertScenario>(initialScenario)
  const [selectedEventType, setSelectedEventType] = useState<"datadog-event" | "datadog-log" | "email">("datadog-event")
  const [saving, setSaving] = useState(false)
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<Settings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  // Removed execution modal states - now using dedicated page
  const { toast } = useToast()

  // Sort events by delay for display
  const sortedEvents = [...scenario.events].sort((a, b) => a.delay - b.delay)

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const { data } = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setSettingsLoading(false)
      }
    }
    
    loadSettings()
  }, [])

  const executeScenario = async () => {
    if (!scenario.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please save the scenario before executing.",
        variant: "destructive",
      })
      return
    }

    if (scenario.events.length === 0) {
      toast({
        title: "Validation Error",
        description: "Scenario must have at least one event to execute.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/scenarios/${scenario.id}/execute`, {
        method: 'POST',
      })

      if (response.ok) {
        const executionResult = await response.json()
        const executionId = executionResult.executionRunId
        
        // Navigate to the execution progress page
        if (executionId) {
          router.push(`/execution/${executionId}`)
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Execution Failed",
          description: errorData.message || "Failed to execute scenario",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to execute scenario:", error)
      toast({
        title: "Execution Error",
        description: "Failed to start scenario execution",
        variant: "destructive",
      })
    }
  }

  const addEvent = () => {
    // Calculate next delay (10 seconds after the last event)
    const lastDelay = scenario.events.length > 0 ? Math.max(...scenario.events.map((e) => e.delay)) : -10
    const nextDelay = lastDelay + 10

    const newEvent: EventType =
      selectedEventType === "datadog-event"
        ? {
            id: crypto.randomUUID(),
            type: "datadog-event",
            title: "",
            text: "",
            delay: nextDelay,
            tags: [],
            priority: 5,
          } as DatadogEvent
        : selectedEventType === "datadog-log"
          ? {
              id: crypto.randomUUID(),
              type: "datadog-log",
              message: "",
              delay: nextDelay,
              ddsource: "synthetic-events",
              hostname: "synthetic-events-host",
              service: "synthetic-events",
              tags: [],
            } as DatadogLog
          : {
              id: crypto.randomUUID(),
              type: "email",
              from: settings?.aws?.fromEmail || "your-verified@email.com",
              to: settings?.datadog?.emailAddress || "recipient@company.com",
              subject: "Alert Notification",
              messageBody: "This is an automated alert notification.\n\n#env:prod #service:api #severity:high",
              format: "plain-text",
              delay: nextDelay,
              tags: [],
            } as EmailEvent

    setScenario((prev) => ({
      ...prev,
      events: [...prev.events, newEvent],
      updatedAt: new Date(),
    }))
  }

  const updateEvent = (eventId: string, updatedEvent: EventType) => {
    setScenario((prev) => ({
      ...prev,
      events: prev.events.map((event) => (event.id === eventId ? updatedEvent : event)),
      updatedAt: new Date(),
    }))
  }

  const removeEvent = (eventId: string) => {
    setScenario((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== eventId),
      updatedAt: new Date(),
    }))
  }

  const handleSave = async () => {
    if (!scenario.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Scenario name is required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      await onSave(scenario)
      toast({
        title: "Success",
        description: "Scenario saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save scenario.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndComplete = async () => {
    if (!scenario.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Scenario name is required.",
        variant: "destructive",
      })
      return
    }

    if (scenario.events.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one event is required to complete a scenario.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Save scenario and mark as completed
      const completedScenario = {
        ...scenario,
        // Add a completed status if your schema supports it
      }
      await onSave(completedScenario)
      toast({
        title: "Success",
        description: "Scenario completed and saved successfully.",
      })
      // Navigate back to dashboard after completion
      onCancel()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete scenario.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const totalDuration = scenario.events.length > 0 ? Math.max(...scenario.events.map((e) => e.delay)) : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const scenarioTypes = [
    "Network Outage",
    "Database Latency", 
    "Performance",
    "Security",
    "Infrastructure",
    "Application Error",
  ]

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "Network Outage":
        return <Wifi className="w-4 h-4" />
      case "Database Latency":
        return <Database className="w-4 h-4" />
      case "Performance":
        return <Zap className="w-4 h-4" />
      case "Security":
        return <AlertTriangle className="w-4 h-4" />
      case "Infrastructure":
        return <Server className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const inferScenarioType = (scenario: AlertScenario): string => {
    if (scenario.name.toLowerCase().includes("database")) return "Database Latency"
    if (scenario.name.toLowerCase().includes("network")) return "Network Outage"
    if (scenario.name.toLowerCase().includes("performance")) return "Performance"
    if (scenario.name.toLowerCase().includes("security")) return "Security"
    if (scenario.name.toLowerCase().includes("infrastructure")) return "Infrastructure"
    return "Application Error"
  }

  // Get current scenario type (from existing type field or infer from name)
  const currentScenarioType = (scenario as any).type || inferScenarioType(scenario)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Scenario</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={saving || !scenario.name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Draft"}
          </Button>
          <Button 
            variant="outline" 
            onClick={executeScenario} 
            disabled={!scenario.name.trim() || scenario.events.length === 0}
            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          >
            <Play className="h-4 w-4 mr-2" />
            Execute
          </Button>
          <Button onClick={handleSaveAndComplete} disabled={saving || !scenario.name.trim() || scenario.events.length === 0}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {saving ? "Completing..." : "Save & Complete"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Scenario Name *</Label>
            <Input
              id="name"
              value={scenario.name}
              onChange={(e) => setScenario((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter scenario name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={scenario.description || ""}
              onChange={(e) => setScenario((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional scenario description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Scenario Type</Label>
            <Select
              value={currentScenarioType}
              onValueChange={(value) => setScenario((prev) => ({ ...prev, type: value } as any))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select scenario type" />
              </SelectTrigger>
              <SelectContent>
                {scenarioTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(type)}
                      <span>{type}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {scenario.events.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <Clock className="h-4 w-4" />
              <span>Total Duration: {formatTime(totalDuration)}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{scenario.events.length} events</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Events ({scenario.events.length})</h2>
          <div className="flex items-center gap-2">
            <Select
              value={selectedEventType}
              onValueChange={(value: "datadog-event" | "datadog-log" | "email") => setSelectedEventType(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="datadog-event">Datadog Event</SelectItem>
                <SelectItem value="datadog-log">Datadog Log</SelectItem>
                <SelectItem value="email">Email Event</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {scenario.events.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No events added yet. Click "Add Event" to get started.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {sortedEvents.map((event, index) => (
            <Card key={event.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {event.type === "datadog-event" && "Datadog Event"}
                    {event.type === "datadog-log" && "Datadog Log"}
                    {event.type === "email" && "Email Event"}
                    <span className="ml-2 text-sm text-gray-500">
                      at {formatTime(event.delay)}
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEvent(event.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delay (seconds)</Label>
                    <Input
                      type="number"
                      value={event.delay}
                      onChange={(e) =>
                        updateEvent(event.id, { ...event, delay: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={tagInputs[event.id] ?? event.tags.join(", ")}
                      onChange={(e) => {
                        const inputValue = e.target.value
                        // Update the raw input state
                        setTagInputs(prev => ({ ...prev, [event.id]: inputValue }))
                        
                        // Parse tags and update the event
                        const tags = inputValue.split(",").map((tag) => tag.trim()).filter(Boolean)
                        updateEvent(event.id, {
                          ...event,
                          tags: tags,
                        })
                      }}
                      onBlur={() => {
                        // Clean up the input formatting on blur
                        const currentTags = scenario.events.find(e => e.id === event.id)?.tags || []
                        setTagInputs(prev => ({ ...prev, [event.id]: currentTags.join(", ") }))
                      }}
                      placeholder="env:prod, service:api"
                    />
                  </div>
                </div>

                {event.type === "datadog-event" && (
                  <>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={(event as DatadogEvent).title}
                        onChange={(e) =>
                          updateEvent(event.id, { ...event, title: e.target.value } as DatadogEvent)
                        }
                        placeholder="Event title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Text</Label>
                      <Textarea
                        value={(event as DatadogEvent).text}
                        onChange={(e) =>
                          updateEvent(event.id, { ...event, text: e.target.value } as DatadogEvent)
                        }
                        placeholder="Event description"
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={(event as DatadogEvent).category || ""}
                          onValueChange={(value) =>
                            updateEvent(event.id, { 
                              ...event, 
                              category: value as "change" | "alert"
                            } as DatadogEvent)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="change">Change Event</SelectItem>
                            <SelectItem value="alert">Alert Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Aggregation Key</Label>
                        <Input
                          value={(event as DatadogEvent).aggregation_key || ""}
                          onChange={(e) =>
                            updateEvent(event.id, { ...event, aggregation_key: e.target.value } as DatadogEvent)
                          }
                          placeholder="Optional aggregation key"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                          value={String((event as DatadogEvent).priority || 5)}
                          onValueChange={(value) =>
                            updateEvent(event.id, { 
                              ...event, 
                              priority: parseInt(value) as 1 | 2 | 3 | 4 | 5
                            } as DatadogEvent)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 (Highest)</SelectItem>
                            <SelectItem value="2">2 (High)</SelectItem>
                            <SelectItem value="3">3 (Medium)</SelectItem>
                            <SelectItem value="4">4 (Low)</SelectItem>
                            <SelectItem value="5">5 (Lowest)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Alert Type</Label>
                        <Select
                          value={(event as DatadogEvent).alert_type || "info"}
                          onValueChange={(value) =>
                            updateEvent(event.id, { 
                              ...event, 
                              alert_type: value as DatadogEvent["alert_type"]
                            } as DatadogEvent)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="user_update">User Update</SelectItem>
                            <SelectItem value="recommendation">Recommendation</SelectItem>
                            <SelectItem value="snapshot">Snapshot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Change Event Specific Fields */}
                    {(event as DatadogEvent).category === "change" && (
                      <>
                        <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                          <h4 className="font-medium text-blue-900">Change Event Attributes</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Changed Resource</Label>
                              <Input
                                value={(event as DatadogEvent).changed_resource || ""}
                                onChange={(e) =>
                                  updateEvent(event.id, { ...event, changed_resource: e.target.value } as DatadogEvent)
                                }
                                placeholder="e.g., service-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select
                                value={(event as DatadogEvent).status || ""}
                                onValueChange={(value) =>
                                  updateEvent(event.id, { 
                                    ...event, 
                                    status: value as "warn" | "error" | "ok"
                                  } as DatadogEvent)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ok">OK</SelectItem>
                                  <SelectItem value="warn">Warn</SelectItem>
                                  <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Alert Event Specific Fields */}
                    {(event as DatadogEvent).category === "alert" && (
                      <>
                        <div className="bg-orange-50 p-4 rounded-lg space-y-4">
                          <h4 className="font-medium text-orange-900">Alert Event Attributes</h4>
                          <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                              value={(event as DatadogEvent).message || ""}
                              onChange={(e) =>
                                updateEvent(event.id, { ...event, message: e.target.value } as DatadogEvent)
                              }
                              placeholder="Alert message details"
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Integration ID</Label>
                            <Input
                              value={(event as DatadogEvent).integration_id || ""}
                              onChange={(e) =>
                                updateEvent(event.id, { ...event, integration_id: e.target.value } as DatadogEvent)
                              }
                              placeholder="custom-events"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {event.type === "datadog-log" && (
                  <>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        value={(event as DatadogLog).message}
                        onChange={(e) =>
                          updateEvent(event.id, { ...event, message: e.target.value } as DatadogLog)
                        }
                        placeholder="Log message"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Source (ddsource)</Label>
                        <Input
                          value={(event as DatadogLog).ddsource}
                          onChange={(e) =>
                            updateEvent(event.id, { ...event, ddsource: e.target.value } as DatadogLog)
                          }
                          placeholder="synthetic-events"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Service</Label>
                        <Input
                          value={(event as DatadogLog).service}
                          onChange={(e) =>
                            updateEvent(event.id, { ...event, service: e.target.value } as DatadogLog)
                          }
                          placeholder="synthetic-events"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hostname</Label>
                      <Input
                        value={(event as DatadogLog).hostname}
                        onChange={(e) =>
                          updateEvent(event.id, { ...event, hostname: e.target.value } as DatadogLog)
                        }
                        placeholder="synthetic-events-host"
                      />
                    </div>
                  </>
                )}

                {event.type === "email" && (
                  <>
                    <div className="space-y-2">
                      <Label>Email Format</Label>
                      <Select
                        value={(event as EmailEvent).format || "plain-text"}
                        onValueChange={(value) =>
                          updateEvent(event.id, { 
                            ...event, 
                            format: value as "json" | "plain-text",
                            // Update message body with appropriate example when format changes
                            messageBody: value === "json" 
                              ? `{
  "title": "Alert Notification",
  "text": "This is an automated alert notification from ${scenario.name}",
  "priority": "normal",
  "tags": ["env:prod", "service:api", "severity:high"],
  "alert_type": "info"
}`
                              : (event as EmailEvent).messageBody.includes('{') 
                                ? "This is an automated alert notification.\n\n#env:prod #service:api #severity:high"
                                : (event as EmailEvent).messageBody
                          } as EmailEvent)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plain-text">Plain Text (with hashtag tags)</SelectItem>
                          <SelectItem value="json">JSON Format</SelectItem>
                        </SelectContent>
                      </Select>
                      {((event as EmailEvent).format || "plain-text") === "plain-text" && (
                        <p className="text-xs text-gray-500">
                          Use hashtags (#) in the message body to add tags (e.g., #env:prod #service:api)
                        </p>
                      )}
                      {((event as EmailEvent).format || "plain-text") === "json" && (
                        <p className="text-xs text-gray-500">
                          Provide a JSON object with event properties. This will be parsed by Datadog.
                        </p>
                      )}
                    </div>
                    
                    {/* Settings notification */}
                    {!settingsLoading && (!settings?.aws?.fromEmail || !settings?.datadog?.emailAddress) && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-2">
                            <p className="text-sm text-amber-800 font-medium">
                              Email Configuration Required
                            </p>
                            <p className="text-xs text-amber-700">
                              {!settings?.aws?.fromEmail && "AWS SES from email is not configured. "}
                              {!settings?.datadog?.emailAddress && "Datadog email address is not configured. "}
                              Email events may not work properly.
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-amber-800 border-amber-300 hover:bg-amber-100"
                              onClick={() => {
                                // Trigger settings modal - we'll need to implement this
                                const settingsButton = document.querySelector('[data-settings-trigger]') as HTMLButtonElement
                                if (settingsButton) {
                                  settingsButton.click()
                                }
                              }}
                            >
                              <SettingsIcon className="h-3 w-3 mr-1" />
                              Configure Settings
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From {settings?.aws?.fromEmail && <span className="text-xs text-green-600">(Using AWS settings)</span>}</Label>
                        <Input
                          value={settings?.aws?.fromEmail || (event as EmailEvent).from}
                          onChange={(e) =>
                            updateEvent(event.id, { ...event, from: e.target.value } as EmailEvent)
                          }
                          placeholder="Configure in AWS settings"
                          className={settings?.aws?.fromEmail ? "bg-green-50 border-green-200" : ""}
                          readOnly={!!settings?.aws?.fromEmail}
                        />
                        <p className="text-xs text-gray-500">
                          {settings?.aws?.fromEmail 
                            ? "Emails will be sent from the verified AWS SES email address."
                            : "This field is for reference only. Configure AWS SES settings for actual sending."
                          }
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>To {settings?.datadog?.emailAddress && <span className="text-xs text-green-600">(Using Datadog settings)</span>}</Label>
                        <Input
                          value={settings?.datadog?.emailAddress || (event as EmailEvent).to}
                          onChange={(e) =>
                            updateEvent(event.id, { ...event, to: e.target.value } as EmailEvent)
                          }
                          placeholder="Configure in Datadog settings"
                          className={settings?.datadog?.emailAddress ? "bg-green-50 border-green-200" : ""}
                          readOnly={!!settings?.datadog?.emailAddress}
                        />
                        <p className="text-xs text-gray-500">
                          {settings?.datadog?.emailAddress 
                            ? "Emails will be sent to the configured Datadog email address."
                            : "This field is for reference only. Configure Datadog settings for actual sending."
                          }
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={(event as EmailEvent).subject}
                        onChange={(e) =>
                          updateEvent(event.id, { ...event, subject: e.target.value } as EmailEvent)
                        }
                        placeholder="Email subject"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Message Body</Label>
                      <Textarea
                        value={(event as EmailEvent).messageBody}
                        onChange={(e) =>
                          updateEvent(event.id, { ...event, messageBody: e.target.value } as EmailEvent)
                        }
                        placeholder={((event as EmailEvent).format || "plain-text") === "json" 
                          ? "Enter JSON object for Datadog event"
                          : "Email content (use # for tags, e.g., #env:prod #service:api)"
                        }
                        rows={((event as EmailEvent).format || "plain-text") === "json" ? 8 : 4}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Execution Progress Modal - REMOVED: Now using /execution/[id] page */}
    </div>
  )
}