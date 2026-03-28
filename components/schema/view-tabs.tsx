'use client'

import { useState } from 'react'
import { Plus, X, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchema, generateId, getActiveView } from '@/lib/schema-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SchemaView } from '@/lib/schema-types'

export function ViewTabs() {
  const { state, dispatch } = useSchema()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAddView = () => {
    const newView: SchemaView = {
      id: generateId('view'),
      name: `View ${state.views.length + 1}`,
      schema: { models: [], relationships: [] },
      canvasOffset: { x: 0, y: 0 },
      canvasScale: 1,
    }
    dispatch({ type: 'ADD_VIEW', view: newView })
  }

  const handleStartRename = (view: SchemaView) => {
    setEditingId(view.id)
    setEditValue(view.name)
  }

  const handleFinishRename = () => {
    if (editingId && editValue.trim()) {
      dispatch({ type: 'RENAME_VIEW', viewId: editingId, name: editValue.trim() })
    }
    setEditingId(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishRename()
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditValue('')
    }
  }

  return (
    <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1 overflow-x-auto">
      {state.views.map((view) => (
        <div
          key={view.id}
          className={cn(
            'group flex items-center gap-1 rounded px-2 py-1 text-sm cursor-pointer transition-colors',
            view.id === state.activeViewId
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
          )}
          onClick={() => {
            if (editingId !== view.id) {
              dispatch({ type: 'SWITCH_VIEW', viewId: view.id })
            }
          }}
        >
          {editingId === view.id ? (
            <div className="flex items-center gap-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleFinishRename}
                className="h-5 w-24 px-1 py-0 text-sm"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleFinishRename()
                }}
                className="p-0.5 hover:bg-secondary rounded"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <span className="max-w-32 truncate">{view.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartRename(view)
                }}
                className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-secondary rounded transition-opacity"
              >
                <Pencil className="h-3 w-3" />
              </button>
              {state.views.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete view "${view.name}"?`)) {
                      dispatch({ type: 'DELETE_VIEW', viewId: view.id })
                    }
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive rounded transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </>
          )}
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 ml-1"
        onClick={handleAddView}
        title="Add new view"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
