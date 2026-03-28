'use client'

import { useState } from 'react'
import { Link2, PanelRight, Plus, RotateCcw, Share2, Upload } from 'lucide-react'
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
        { "id": "field-2", "name": "email", "type": "string", "unique": true },
        { "id": "field-3", "name": "name", "type": "string" },
        { "id": "field-4", "name": "created_at", "type": "timestamp" }
      ]
    },
    {
      "id": "model-2",
      "name": "Post",
      "position": { "x": 400, "y": 100 },
      "fields": [
        { "id": "field-5", "name": "id", "type": "uuid", "primaryKey": true },
        { "id": "field-6", "name": "title", "type": "string" },
        { "id": "field-7", "name": "author_id", "type": "uuid", "foreignKey": true }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "name": "author",
      "fromModelId": "model-2",
      "fromFieldId": "field-7",
      "toModelId": "model-1",
      "toFieldId": "field-1",
      "type": "many-to-one"
    }
  ]
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
    if (confirm('Reset all model positions to default layout?')) {
      dispatch({ type: 'RESET_LAYOUT' })
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
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2">
        <div className="flex items-center gap-1.5 mr-4">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">S</span>
          </div>
          <span className="font-semibold text-foreground">Schemaflow</span>
        </div>

        <div className="h-4 w-px bg-border" />

        <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" />
          Import
        </Button>

        <Button variant="ghost" size="sm" onClick={onShare}>
          <Share2 className="h-4 w-4 mr-1.5" />
          Share
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button variant="ghost" size="sm" onClick={handleAddModel}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Model
        </Button>

        <Button variant="ghost" size="sm" onClick={onAddRelationship}>
          <Link2 className="h-4 w-4 mr-1.5" />
          Add Relationship
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button variant="ghost" size="sm" onClick={handleResetLayout}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Reset Layout
        </Button>

        <div className="flex-1" />

        <Button 
          variant={inspectorOpen ? "secondary" : "ghost"} 
          size="sm" 
          onClick={onToggleInspector}
          title={inspectorOpen ? "Hide Inspector" : "Show Inspector"}
        >
          <PanelRight className="h-4 w-4" />
        </Button>

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Schema</DialogTitle>
            <DialogDescription>
              Paste your JSON schema below. This will replace the current schema in the current view.
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
                {showSample ? 'Hide sample schema' : 'Show sample schema'}
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
              <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-auto max-h-48 border">
                {SAMPLE_SCHEMA}
              </pre>
            )}
            
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"models": [...], "relationships": [...]}'
              className="h-64 font-mono text-sm"
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
