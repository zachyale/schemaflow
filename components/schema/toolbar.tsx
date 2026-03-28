'use client'

import { useState } from 'react'
import { Link2, Monitor, Moon, MoreHorizontal, Plus, RotateCcw, Share2, Sun, Trash2, Upload, ZoomIn } from 'lucide-react'
import { useTheme } from 'next-themes'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'

interface ToolbarProps {
  onAddRelationship: () => void
  onShare: () => void
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

export function Toolbar({ onAddRelationship, onShare }: ToolbarProps) {
  const { state, dispatch } = useSchema()
  const { setTheme } = useTheme()
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
    <>
      <div className="flex items-center gap-1 border-b bg-card px-3 py-1.5">
        {/* Logo */}
        <div className="flex items-center gap-1.5 mr-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:block">Schemaflow</span>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Add / Import Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleAddModel}>
              <Plus className="h-4 w-4 mr-2" />
              Add Model
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddRelationship}>
              <Link2 className="h-4 w-4 mr-2" />
              Add Relationship
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Models
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Overflow Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share & Export
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Session</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleResetLayout}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Layout
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResetZoom}>
              <ZoomIn className="h-4 w-4 mr-2" />
              Reset Zoom
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResetSession} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Session
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4 mr-2" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
            <DialogTitle>Import Models</DialogTitle>
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
    </>
  )
}
