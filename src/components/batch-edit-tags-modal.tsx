"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { X, Plus, Tag, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

interface BatchEditTagsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedScenarios: string[]
  onTagsUpdated?: () => void
}

interface ExistingTagsData {
  commonTags: string[]
  allTags: string[]
  tagCounts: Record<string, number>
}

interface PreviewData {
  affectedCount: number
  finalTags: string[]
  addedTags: string[]
  removedTags: string[]
}

export default function BatchEditTagsModal({
  isOpen,
  onClose,
  selectedScenarios,
  onTagsUpdated
}: BatchEditTagsModalProps) {
  const [newTags, setNewTags] = useState<string[]>([]) // Tags to add
  const [removedTags, setRemovedTags] = useState<string[]>([]) // Tags removed from existing
  const [currentInput, setCurrentInput] = useState('')
  const [existingTags, setExistingTags] = useState<ExistingTagsData | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load existing tags for selected scenarios
  useEffect(() => {
    if (isOpen && selectedScenarios.length > 0) {
      loadExistingTags()
    }
  }, [isOpen, selectedScenarios])

  // Update preview when tags change
  useEffect(() => {
    updatePreview()
  }, [newTags, removedTags, existingTags, selectedScenarios])

  const loadExistingTags = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/scenarios/tags?ids=${selectedScenarios.join(',')}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load existing tags')
      }
      
      setExistingTags(result.data)
    } catch (error) {
      console.error('Failed to load existing tags:', error)
      setError(error instanceof Error ? error.message : 'Failed to load existing tags')
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreview = () => {
    if (!existingTags) return

    // Calculate final tags more accurately for mixed scenario states
    // For new tags: they'll be added to ALL scenarios
    // For removed tags: they'll be removed from scenarios that currently have them
    // For remaining tags: they'll stay on scenarios that currently have them
    
    const finalTagsSet = new Set<string>()
    
    // Add all current tags that aren't being removed
    existingTags.allTags.forEach(tag => {
      if (!removedTags.includes(tag)) {
        finalTagsSet.add(tag)
      }
    })
    
    // Add all new tags (these will go to all scenarios)
    newTags.forEach(tag => finalTagsSet.add(tag))
    
    const finalTags = Array.from(finalTagsSet).sort()

    setPreviewData({
      affectedCount: selectedScenarios.length,
      finalTags,
      addedTags: newTags,
      removedTags
    })
  }

  const addNewTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !newTags.includes(trimmedTag) && !existingTags?.allTags.includes(trimmedTag)) {
      setNewTags([...newTags, trimmedTag])
      setCurrentInput('')
    }
  }

  const removeNewTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove))
  }

  const removeExistingTag = (tagToRemove: string) => {
    if (!removedTags.includes(tagToRemove)) {
      setRemovedTags([...removedTags, tagToRemove])
    }
  }

  const restoreExistingTag = (tagToRestore: string) => {
    setRemovedTags(removedTags.filter(tag => tag !== tagToRestore))
  }

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addNewTag(currentInput)
    }
  }

  const handleApplyChanges = async () => {
    if (!previewData || (newTags.length === 0 && removedTags.length === 0)) {
      setError('No changes to apply')
      return
    }

    setIsApplying(true)
    setError(null)
    setSuccess(null)

    try {
      // Apply changes step by step to handle partial removals correctly
      let results = []
      
      // Step 1: Remove tags (from scenarios that have them)
      if (removedTags.length > 0) {
        const removeResponse = await fetch('/api/scenarios/batch-tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenarioIds: selectedScenarios,
            operation: 'remove',
            tags: removedTags
          })
        })
        
        const removeResult = await removeResponse.json()
        if (!removeResult.success) {
          throw new Error(removeResult.message || 'Failed to remove tags')
        }
        results.push(`Removed ${removedTags.length} tag(s)`)
      }
      
      // Step 2: Add new tags (to all scenarios)
      if (newTags.length > 0) {
        const addResponse = await fetch('/api/scenarios/batch-tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenarioIds: selectedScenarios,
            operation: 'add',
            tags: newTags
          })
        })
        
        const addResult = await addResponse.json()
        if (!addResult.success) {
          throw new Error(addResult.message || 'Failed to add tags')
        }
        results.push(`Added ${newTags.length} tag(s)`)
      }

      setSuccess(`Successfully updated tags: ${results.join(', ')}`)
      
      // Call callback to refresh parent component
      if (onTagsUpdated) {
        onTagsUpdated()
      }

      // Close modal after short delay
      setTimeout(() => {
        handleClose()
      }, 1500)

    } catch (error) {
      console.error('Failed to apply tag changes:', error)
      setError(error instanceof Error ? error.message : 'Failed to apply changes')
    } finally {
      setIsApplying(false)
    }
  }

  const handleClose = () => {
    setNewTags([])
    setRemovedTags([])
    setCurrentInput('')
    setExistingTags(null)
    setPreviewData(null)
    setError(null)
    setSuccess(null)
    onClose()
  }

  const getSuggestedTags = () => {
    if (!existingTags) return []
    
    // Suggest tags from other scenarios that aren't already in use
    return existingTags.allTags.filter(tag => 
      !existingTags.commonTags.includes(tag) && 
      !newTags.includes(tag) &&
      !removedTags.includes(tag)
    ).slice(0, 6)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Batch Edit Tags ({selectedScenarios.length} scenarios selected)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading existing tags...</span>
            </div>
          )}

          {/* Main Content */}
          {!isLoading && existingTags && (
            <>
              {/* Current Tags Display with X to remove */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Current Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {existingTags.commonTags.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                        Common Tags (in all {selectedScenarios.length} scenarios)
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {existingTags.commonTags.map((tag) => {
                          const isRemoved = removedTags.includes(tag)
                          const total = selectedScenarios.length
                          return (
                            <Badge 
                              key={tag} 
                              variant={isRemoved ? "outline" : "default"} 
                              className={`text-xs relative group cursor-pointer ${
                                isRemoved ? 'opacity-50 line-through' : ''
                              }`}
                              onClick={() => isRemoved ? restoreExistingTag(tag) : removeExistingTag(tag)}
                              title={isRemoved 
                                ? `Click to restore tag (currently in all ${total} scenarios)`
                                : `Click to remove from all ${total} scenarios`
                              }
                            >
                              {tag}
                              {!isRemoved && (
                                <X className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                              {isRemoved && (
                                <span className="ml-1 text-xs">↶</span>
                              )}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {existingTags.allTags.length > existingTags.commonTags.length && (
                    <div>
                      <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
                        Other Tags (partial coverage)
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {existingTags.allTags
                          .filter(tag => !existingTags.commonTags.includes(tag))
                          .map((tag) => {
                            const isRemoved = removedTags.includes(tag)
                            const count = existingTags.tagCounts[tag]
                            const total = selectedScenarios.length
                            return (
                              <Badge 
                                key={tag} 
                                variant={isRemoved ? "outline" : "secondary"} 
                                className={`text-xs relative group cursor-pointer ${
                                  isRemoved ? 'opacity-50 line-through' : ''
                                }`}
                                onClick={() => isRemoved ? restoreExistingTag(tag) : removeExistingTag(tag)}
                                title={isRemoved 
                                  ? `Click to restore tag (currently in ${count} of ${total} scenarios)`
                                  : `Click to remove from ${count} of ${total} scenarios`
                                }
                              >
                                {tag} ({count})
                                {!isRemoved && (
                                  <X className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                                {isRemoved && (
                                  <span className="ml-1 text-xs">↶</span>
                                )}
                              </Badge>
                            )
                          })}
                      </div>
                    </div>
                  )}
                  
                  {existingTags.allTags.length === 0 && (
                    <p className="text-sm text-gray-500">No existing tags found</p>
                  )}
                </CardContent>
              </Card>

              {/* New Tags Section */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Add New Tags</Label>
                
                {/* New Tags Display */}
                {newTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 p-2 bg-blue-50 rounded-lg">
                    {newTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        {tag}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto p-0 ml-1"
                          onClick={() => removeNewTag(tag)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tag Input Field */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Type tag and press Enter or comma"
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleInputKeyPress}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addNewTag(currentInput)}
                    disabled={!currentInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Suggested Tags */}
                {getSuggestedTags().length > 0 && (
                  <div className="mt-2">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">
                      Suggested Tags
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getSuggestedTags().map((tag) => (
                        <Button
                          key={tag}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => addNewTag(tag)}
                        >
                          + {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {previewData && (newTags.length > 0 || removedTags.length > 0) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Final tags for {previewData.affectedCount} scenario{previewData.affectedCount !== 1 ? 's' : ''}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {previewData.finalTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {previewData.addedTags.length > 0 && (
                      <p className="text-xs text-green-600">
                        + Adding to all {selectedScenarios.length} scenarios: {previewData.addedTags.join(', ')}
                      </p>
                    )}
                    {previewData.removedTags.length > 0 && (
                      <div className="space-y-1">
                        {previewData.removedTags.map(tag => {
                          const count = existingTags?.tagCounts[tag] || 0
                          const isCommon = existingTags?.commonTags.includes(tag)
                          return (
                            <p key={tag} className="text-xs text-red-600">
                              - Removing "{tag}" from {count} of {selectedScenarios.length} scenario{count !== 1 ? 's' : ''}
                              {isCommon ? ' (all scenarios)' : ''}
                            </p>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isApplying}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyChanges} 
              disabled={isApplying || (newTags.length === 0 && removedTags.length === 0)}
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Applying...
                </>
              ) : (
                'Apply Changes'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}