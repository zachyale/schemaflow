'use client'

import { useState } from 'react'
import { Download, Link2, PanelRight, Plus, RotateCcw, Share2, Upload } from 'lucide-react'
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

export function Toolbar({ onAddRelationship, onShare, inspectorOpen, onToggleInspector }: ToolbarProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState('')

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

  const handleExport = () => {
    setExportOpen(true)
  }

  const handleDownload = () => {
    const json = JSON.stringify(activeView.schema, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(activeView.schema, null, 2))
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

        <Button variant="ghost" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" />
          Export
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
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Schema</DialogTitle>
            <DialogDescription>
              Paste your JSON schema below. This will replace the current schema.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='{"models": [...], "relationships": [...]}'
            className="h-80 font-mono text-sm"
          />
          {importError && (
            <p className="text-sm text-destructive">{importError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Schema</DialogTitle>
            <DialogDescription>
              Copy or download your schema as JSON.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={JSON.stringify(activeView.schema, null, 2)}
            readOnly
            className="h-80 font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyToClipboard}>
              Copy to Clipboard
            </Button>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
