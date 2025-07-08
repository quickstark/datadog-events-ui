"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  Settings,
  Download,
  Upload,
  Tag,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowUp,
  MoreVertical,
  Database,
  Mail,
  Activity,
  FileText,
  Zap,
  Server,
  Wifi,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  History,
} from "lucide-react"
import { AlertScenario } from "@/types/events"
import SettingsModal from "@/components/settings-modal"
import BatchEditTagsModal from "@/components/batch-edit-tags-modal"

interface DashboardScenario {
  id: string
  name: string
  type: string
  status: "draft" | "pending" | "completed" | "failed"
  eventCount: number
  lastModified: string
  tags: string[]
}

export default function Dashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isWatchdogOpen, setIsWatchdogOpen] = useState(true)
  const [isTypeOpen, setIsTypeOpen] = useState(true)
  const [isStatusOpen, setIsStatusOpen] = useState(true)
  const [isTagsOpen, setIsTagsOpen] = useState(true)
  const [hideControls, setHideControls] = useState(false)
  const [showDraftScenarios, setShowDraftScenarios] = useState(true)
  const [isNewScenarioOpen, setIsNewScenarioOpen] = useState(false)
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([])
  const [scenarios, setScenarios] = useState<DashboardScenario[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  // Removed modal states - now using dedicated pages
  const [showDuplicateErrorDialog, setShowDuplicateErrorDialog] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string>('')
  const [showExportErrorDialog, setShowExportErrorDialog] = useState(false)
  const [exportError, setExportError] = useState<string>('')
  const [showDeleteErrorDialog, setShowDeleteErrorDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string>('')
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [scenarioToDelete, setScenarioToDelete] = useState<DashboardScenario | null>(null)
  const [showBatchEditTagsModal, setShowBatchEditTagsModal] = useState(false)
  
  // Filter states
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['draft', 'pending', 'completed', 'failed'])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  // Removed executionProgress state - now handled in dedicated page

  const [newScenario, setNewScenario] = useState({
    name: "",
    type: "",
    description: "",
  })

  const inferScenarioType = (scenario: AlertScenario): string => {
    if (scenario.name.toLowerCase().includes("database")) return "Database Latency"
    if (scenario.name.toLowerCase().includes("network")) return "Network Outage"
    if (scenario.name.toLowerCase().includes("performance")) return "Performance"
    if (scenario.name.toLowerCase().includes("security")) return "Security"
    if (scenario.name.toLowerCase().includes("infrastructure")) return "Infrastructure"
    return "Application Error"
  }

  const extractTags = (scenario: AlertScenario): string[] => {
    const tags = new Set<string>()
    scenario.events.forEach((event) => {
      event.tags.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags)
  }

  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return "just now"
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const loadScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios')
      if (!response.ok) {
        throw new Error('Failed to fetch scenarios')
      }
      const responseData = await response.json()
      console.log('Dashboard: Raw API response:', responseData)
      
      const storedScenarios: AlertScenario[] = responseData.data || responseData
      console.log('Dashboard: Parsed scenarios:', storedScenarios)
      
      if (!Array.isArray(storedScenarios)) {
        console.error('Dashboard: Expected array but got:', typeof storedScenarios, storedScenarios)
        // Set empty array if we don't get proper data
        setScenarios([])
        return
      }
      
      const dashboardScenarios: DashboardScenario[] = storedScenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        type: (scenario as any).type || inferScenarioType(scenario),
        status: scenario.status || (scenario.events.length === 0 ? "draft" : "pending"),
        eventCount: scenario.events.length,
        lastModified: formatRelativeTime(new Date(scenario.updatedAt)),
        tags: extractTags(scenario),
      }))
      console.log('Dashboard: Mapped dashboard scenarios:', dashboardScenarios)
      setScenarios(dashboardScenarios)
    } catch (error) {
      console.error("Failed to load scenarios:", error)
    }
  }

  useEffect(() => {
    setMounted(true)
    loadScenarios()

    // Also reload scenarios every 2 seconds as a backup when page is visible
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadScenarios()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Reload scenarios when returning to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadScenarios()
      }
    }

    const handleFocus = () => {
      loadScenarios()
    }

    const handlePageShow = () => {
      loadScenarios()
    }

    // Multiple event listeners for maximum compatibility
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return null
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

  const handleCreateScenario = async () => {
    if (!newScenario.name.trim()) return

    try {
      const scenario = {
        name: newScenario.name,
        description: newScenario.description || "",
        events: [],
        status: "draft" as const,
        tags: [],
      }

      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scenario),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create scenario')
      }

      const result = await response.json()
      console.log('Scenario created successfully:', result)
      
      setIsNewScenarioOpen(false)
      setNewScenario({ name: "", type: "", description: "" })
      
      // Reload scenarios to show the new one
      await loadScenarios()
      
      // Redirect to scenario editor
      router.push(`/scenarios/${result.data.id}`)
    } catch (error) {
      console.error("Failed to create scenario:", error)
    }
  }

  const handleExportScenarios = async () => {
    try {
      const selectedIds = selectedScenarios.length > 0 ? selectedScenarios.join(',') : ''
      const url = `/api/scenarios/export${selectedIds ? `?ids=${selectedIds}` : ''}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to export scenarios')
      }
      
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `scenarios-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error("Failed to export scenarios:", error)
    }
  }

  const handleImportScenarios = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const content = await file.text()
        const data = JSON.parse(content)
        
        const response = await fetch('/api/scenarios/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          throw new Error('Failed to import scenarios')
        }
        
        await loadScenarios() // Refresh the list
        console.log('Scenarios imported successfully')
      } catch (error) {
        console.error("Failed to import scenarios:", error)
      }
    }
    input.click()
  }

  const handleDeleteSelected = () => {
    if (selectedScenarios.length === 0) {
      alert('Please select scenarios to delete.')
      return
    }

    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    setShowDeleteDialog(false)
    setDeleting(true)
    
    try {
      // Delete each selected scenario
      const deletePromises = selectedScenarios.map(scenarioId =>
        fetch(`/api/scenarios/${scenarioId}`, {
          method: 'DELETE',
        })
      )

      const responses = await Promise.all(deletePromises)
      
      // Check if all deletions were successful
      const failedDeletions = responses.filter(response => !response.ok)
      
      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} scenario(s)`)
      }

      // Clear selected scenarios and reload the list
      setSelectedScenarios([])
      await loadScenarios()
      
      console.log(`Successfully deleted ${selectedScenarios.length} scenario(s)`)
    } catch (error) {
      console.error("Failed to delete scenarios:", error)
      alert('Failed to delete some scenarios. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const handleExecuteSelected = async () => {
    if (selectedScenarios.length === 0) {
      return
    }

    // Filter out scenarios with no events (draft status)
    const executableScenarios = selectedScenarios.filter(scenarioId => {
      const scenario = scenarios.find(s => s.id === scenarioId)
      return scenario && scenario.eventCount > 0
    })

    if (executableScenarios.length === 0) {
      return
    }

    try {
      // Generate execution ID locally
      const executionId = crypto.randomUUID()
      
      console.log(`[Dashboard] Starting execution of ${executableScenarios.length} scenarios: ${executionId}`)
      
      // Navigate immediately to execution page with scenario data
      // The execution page will handle starting the execution
      const searchParams = new URLSearchParams({
        scenarios: executableScenarios.join(',')
      })
      
      router.push(`/execution/${executionId}?${searchParams.toString()}`)
      
      // Clear selected scenarios after navigation
      setSelectedScenarios([])
      
    } catch (error) {
      console.error('Error starting execution:', error)
      // TODO: Show error toast
    }
  }

  // Removed loadExecutionHistory - now handled in history page

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  // Individual scenario action handlers
  const handleViewDetails = (scenario: DashboardScenario) => {
    router.push(`/scenarios/${scenario.id}`)
  }

  const handleAddEvent = (scenario: DashboardScenario) => {
    router.push(`/scenarios/${scenario.id}?tab=events&action=add`)
  }

  const handleDuplicateScenario = async (scenario: DashboardScenario) => {
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}`)
      if (!response.ok) throw new Error('Failed to fetch scenario')
      
      const originalScenario = await response.json()
      
      // Create a duplicate with modified name and reset status
      const duplicateScenario = {
        ...originalScenario,
        name: `${originalScenario.name} (Copy)`,
        status: 'draft',
        id: undefined // Let the API generate a new ID
      }
      
      const createResponse = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateScenario),
      })
      
      if (!createResponse.ok) throw new Error('Failed to create duplicate')
      
      await loadScenarios() // Refresh the list
      console.log('Scenario duplicated successfully')
    } catch (error) {
      console.error('Failed to duplicate scenario:', error)
      setDuplicateError('Failed to duplicate scenario. Please try again.')
      setShowDuplicateErrorDialog(true)
    }
  }

  const handleExportScenario = async (scenario: DashboardScenario) => {
    try {
      const response = await fetch(`/api/scenarios/export?ids=${scenario.id}`)
      if (!response.ok) throw new Error('Failed to export scenario')
      
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      a.download = `${scenario.name.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Failed to export scenario:', error)
      setExportError('Failed to export scenario. Please try again.')
      setShowExportErrorDialog(true)
    }
  }

  const handleDeleteScenario = (scenario: DashboardScenario) => {
    setScenarioToDelete(scenario)
    setShowDeleteConfirmDialog(true)
  }

  const confirmDeleteScenario = async () => {
    if (!scenarioToDelete) return
    
    setShowDeleteConfirmDialog(false)
    
    try {
      const response = await fetch(`/api/scenarios/${scenarioToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete scenario')
      
      await loadScenarios() // Refresh the list
      console.log('Scenario deleted successfully')
    } catch (error) {
      console.error('Failed to delete scenario:', error)
      setDeleteError('Failed to delete scenario. Please try again.')
      setShowDeleteErrorDialog(true)
    } finally {
      setScenarioToDelete(null)
    }
  }

  const filteredScenarios = scenarios.filter((scenario) => {
    // Search term filter
    if (searchTerm && !scenario.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    
    // Type filter
    if (selectedTypes.length > 0 && !selectedTypes.includes(scenario.type)) return false
    
    // Status filter
    if (!selectedStatuses.includes(scenario.status)) return false
    
    // Tag filter
    if (selectedTags.length > 0) {
      const hasSelectedTag = selectedTags.some(tag => scenario.tags.includes(tag))
      if (!hasSelectedTag) return false
    }
    
    return true
  })

  const draftScenarios = scenarios.filter((s) => s.status === "draft").length
  const pendingScenarios = scenarios.filter((s) => s.status === "pending").length
  const completedScenarios = scenarios.filter((s) => s.status === "completed").length
  const failedScenarios = scenarios.filter((s) => s.status === "failed").length

  const allTags = Array.from(new Set(scenarios.flatMap((s) => s.tags)))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-3 h-3 text-white" />
              </div>
              <h1 className="text-lg font-medium text-gray-900">Alert Scenarios Management</h1>
            </div>
            <nav className="flex space-x-6">
              <a href="#" className="text-blue-600 border-b-2 border-blue-600 pb-3 font-medium">
                Scenarios
              </a>
              <a href="#" className="text-gray-500 pb-3">
                Analytics
              </a>
              <a href="#" className="text-gray-500 pb-3">
                Settings
              </a>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </nav>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              className="border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
              onClick={handleImportScenarios}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Scenarios
            </Button>
            <Dialog open={isNewScenarioOpen} onOpenChange={setIsNewScenarioOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Scenario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Alert Scenario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="scenario-name">Scenario Name</Label>
                    <Input
                      id="scenario-name"
                      value={newScenario.name}
                      onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                      placeholder="e.g., Database Connection Timeout"
                    />
                  </div>
                  <div>
                    <Label htmlFor="scenario-type">Type</Label>
                    <Select
                      value={newScenario.type}
                      onValueChange={(value) => setNewScenario({ ...newScenario, type: value })}
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
                  <div>
                    <Label htmlFor="scenario-description">Description</Label>
                    <Textarea
                      id="scenario-description"
                      value={newScenario.description}
                      onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                      placeholder="Describe the alert scenario..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsNewScenarioOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateScenario}>Create Scenario</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Secondary Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-blue-600 font-medium">Views</span>
            </div>
            <span className="text-gray-900">All Scenarios</span>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Status Cards */}
            <div className="grid grid-cols-1 gap-3">
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      DRAFT
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{draftScenarios} scenarios</div>
                  <div className="text-sm text-gray-600">Incomplete scenarios</div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      PENDING
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{pendingScenarios} scenarios</div>
                  <div className="text-sm text-gray-600">Ready to execute</div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      COMPLETED
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{completedScenarios} scenarios</div>
                  <div className="text-sm text-gray-600">Successfully executed</div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      FAILED
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{failedScenarios} scenarios</div>
                  <div className="text-sm text-gray-600">Execution failed</div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search scenarios..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">FILTERS</div>

              {/* Type */}
              <Collapsible open={isTypeOpen} onOpenChange={setIsTypeOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    {isTypeOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">Type</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 ml-6 space-y-2">
                  {scenarioTypes.map((type) => (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTypes([...selectedTypes, type])
                            } else {
                              setSelectedTypes(selectedTypes.filter(t => t !== type))
                            }
                          }}
                        />
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(type)}
                          <span className="text-sm">{type}</span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{scenarios.filter((s) => s.type === type).length}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Status */}
              <Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    {isStatusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">Status</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 ml-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={selectedStatuses.includes('draft')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, 'draft'])
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== 'draft'))
                          }
                        }}
                      />
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm">Draft</span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{draftScenarios}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={selectedStatuses.includes('pending')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, 'pending'])
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== 'pending'))
                          }
                        }}
                      />
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm">Pending</span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{pendingScenarios}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={selectedStatuses.includes('completed')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, 'completed'])
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== 'completed'))
                          }
                        }}
                      />
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Completed</span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{completedScenarios}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={selectedStatuses.includes('failed')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, 'failed'])
                          } else {
                            setSelectedStatuses(selectedStatuses.filter(s => s !== 'failed'))
                          }
                        }}
                      />
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Failed</span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{failedScenarios}</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Tags */}
              <Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    {isTagsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="font-medium">Scenario Tags</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 ml-6 space-y-2">
                  {allTags.slice(0, 6).map((tag) => (
                    <div key={tag} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTags([...selectedTags, tag])
                            } else {
                              setSelectedTags(selectedTags.filter(t => t !== tag))
                            }
                          }}
                        />
                        <span className="text-sm">{tag}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {scenarios.filter((s) => s.tags.includes(tag)).length}
                      </span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setHideControls(!hideControls)}>
                {hideControls ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                Hide Controls
              </Button>
              <span className="text-sm text-gray-600">Showing {filteredScenarios.length} scenarios</span>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={showDraftScenarios} 
                  onCheckedChange={(checked) => setShowDraftScenarios(checked === true)} 
                />
                <span className="text-sm">Show draft scenarios</span>
              </div>
            </div>
            <SettingsModal />
          </div>

          {!hideControls && (
            <div className="flex items-center space-x-2 mb-4">
              <Button variant="outline" size="sm" onClick={handleExecuteSelected}>
                <Play className="w-4 h-4 mr-2" />
                Execute Selected
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportScenarios}>
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowBatchEditTagsModal(true)}
                disabled={selectedScenarios.length === 0}
              >
                <Tag className="w-4 h-4 mr-2" />
                Batch Edit Tags
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDeleteSelected}
                disabled={selectedScenarios.length === 0 || deleting}
              >
                {deleting ? "Deleting..." : "Delete Selected"}
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedScenarios.length === filteredScenarios.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedScenarios(filteredScenarios.map((s) => s.id))
                        } else {
                          setSelectedScenarios([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center space-x-1">
                      <ArrowUp className="w-4 h-4" />
                      <span>STATUS</span>
                    </div>
                  </TableHead>
                  <TableHead>TYPE</TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead>EVENTS</TableHead>
                  <TableHead>SCENARIO TAGS</TableHead>
                  <TableHead>LAST MODIFIED</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenarios.map((scenario) => (
                  <TableRow key={scenario.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedScenarios.includes(scenario.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedScenarios([...selectedScenarios, scenario.id])
                          } else {
                            setSelectedScenarios(selectedScenarios.filter((id) => id !== scenario.id))
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          scenario.status === "draft"
                            ? "bg-gray-100 text-gray-800"
                            : scenario.status === "pending"
                              ? "bg-blue-100 text-blue-800"
                              : scenario.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : scenario.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                        }
                      >
                        {scenario.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(scenario.type)}
                        <span>{scenario.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{scenario.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="h-6 px-3 min-w-[80px] flex items-center justify-center">{scenario.eventCount} events</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {scenario.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {scenario.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{scenario.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{scenario.lastModified}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          title="Edit Scenario"
                          onClick={() => router.push(`/scenarios/${scenario.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {(scenario.status === 'completed' || scenario.status === 'failed') && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="View Execution History"
                            onClick={() => {
                              router.push('/history')
                            }}
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewDetails(scenario)}>View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddEvent(scenario)}>Add Event</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateScenario(scenario)}>Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportScenario(scenario)}>Export</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteScenario(scenario)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredScenarios.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {scenarios.length === 0 ? "No scenarios created yet. Click 'New Scenario' to get started." : "No scenarios match your current filters."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Execution Progress Modal - REMOVED: Now using /execution/[id] page */}

      {/* Execution History Modal - REMOVED: Now using /history page */}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Scenarios
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {selectedScenarios.length} scenario{selectedScenarios.length > 1 ? 's' : ''}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Scenario Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Scenario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                "{scenarioToDelete?.name}"
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirmDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDeleteScenario}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Error Dialog */}
      <Dialog open={showDuplicateErrorDialog} onOpenChange={setShowDuplicateErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Duplicate Failed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {duplicateError}
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowDuplicateErrorDialog(false)}>
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Error Dialog */}
      <Dialog open={showExportErrorDialog} onOpenChange={setShowExportErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Export Failed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {exportError}
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowExportErrorDialog(false)}>
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Error Dialog */}
      <Dialog open={showDeleteErrorDialog} onOpenChange={setShowDeleteErrorDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Delete Failed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {deleteError}
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowDeleteErrorDialog(false)}>
                OK
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Edit Tags Modal */}
      <BatchEditTagsModal
        isOpen={showBatchEditTagsModal}
        onClose={() => setShowBatchEditTagsModal(false)}
        selectedScenarios={selectedScenarios}
        onTagsUpdated={loadScenarios}
      />
    </div>
  )
}