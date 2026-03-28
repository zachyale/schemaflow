'use client'

import { useState } from 'react'
import { Link2, MoreHorizontal, Plus, RotateCcw, Share2, Trash2, Upload, PanelRight, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSchema, generateId, validateSchema, getActiveView } from '@/lib/schema-store'
import type { Model } from '@/lib/schema-types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Textarea } from '@/components/ui/textarea'
import { ThemeToggle } from '@/components/theme-toggle'

interface ToolbarProps {
  onAddRelationship: () => void
  onShare: () => void
  inspectorOpen: boolean
  onToggleInspector: () => void
}

const SAMPLE_SCHEMA = `{
  "models": [
    {
      "id": "model-1",
      "name": "User",
      "position": { "x": 100, "y": 100 },
      "fields": [
        { "id": "field-1", "name": "id", "type": "uuid", "primaryKey": true },
        { "id": "field-2", "name": "email", "type": "string", "unique": true }
      ]
    }
  ],
  "relationships": []
}`

export function Toolbar({ onAddRelationship, onShare, inspectorOpen, onToggleInspector }: ToolbarProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState('')
  const [showSample, setShowSample] = useState(false)

  const handleAddModel = () => {
    const newModel: Model = {
      id: generateId('model'),
      name: 'NewModel',
      position: {
        x: 100 - activeView.canvasOffset.x + Math.random() * 100,
        y: 100 - activeView.canvasOffset.y + Math.random() * 100,
      },
      fields: [
        {
          id: generateId('field'),
          name: 'id',
          type: 'uuid',
          primaryKey: true,
        },
      ],
    }
    dispatch({ type: 'ADD_MODEL', model: newModel })
    dispatch({ type: 'SET_SELECTION', selection: { type: 'model', modelId: newModel.id } })
  }

  const handleResetLayout = () => {
    dispatch({ type: 'RESET_LAYOUT' })
  }

  const handleResetZoom = () => {
    dispatch({ type: 'SET_CANVAS_OFFSET', offset: { x: 0, y: 0 } })
    dispatch({ type: 'SET_CANVAS_SCALE', scale: 1 })
  }

  const handleResetSession = () => {
    if (confirm('This will clear all views and reset to the default state. Continue?')) {
      dispatch({ type: 'RESET_SESSION' })
    }
  }

  const handleImport = () => {
    setImportError('')
    try {
      const parsed = JSON.parse(importJson)
      const result = validateSchema(parsed)
      if (result.valid && result.schema) {
        dispatch({ type: 'SET_SCHEMA', schema: result.schema })
        setImportOpen(false)
        setImportJson('')
      } else {
        setImportError(result.error || 'Invalid schema')
      }
    } catch {
      setImportError('Invalid JSON syntax')
    }
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center gap-1 border-b bg-card px-3 py-1.5">
        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:block">Schemaflow</span>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Primary Actions - Icon Only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddModel}>
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Model</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddRelationship}>
              <Link2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Relationship</TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share & Export</TooltipContent>
        </Tooltip>

        {/* More Menu */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleResetLayout}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Layout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResetZoom}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Reset Zoom
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleResetSession} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Right Side */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={inspectorOpen ? "secondary" : "ghost"} 
              size="icon"
              className="h-8 w-8"
              onClick={onToggleInspector}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{inspectorOpen ? "Hide Inspector" : "Show Inspector"}</TooltipContent>
        </Tooltip>

        <ThemeToggle />
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => {
        setImportOpen(open)
        if (!open) {
          setShowSample(false)
          setImportError('')
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Schema</DialogTitle>
            <DialogDescription>
              Paste JSON to replace the current view.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-xs"
                onClick={() => setShowSample(!showSample)}
              >
                {showSample ? 'Hide sample' : 'Show sample'}
              </Button>
              {showSample && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setImportJson(SAMPLE_SCHEMA)
                    setShowSample(false)
                  }}
                >
                  Use sample
                </Button>
              )}
            </div>
            
            {showSample && (
              <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-36 border">
                {SAMPLE_SCHEMA}
              </pre>
            )}
            
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"models": [...], "relationships": [...]}'
              className="h-48 font-mono text-sm"
            />
          </div>
          
          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importJson.trim()}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
