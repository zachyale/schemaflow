'use client'

import { useState, useRef, useCallback } from 'react'
import { Plus, X, Check, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchema, generateId } from '@/lib/schema-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SchemaView } from '@/lib/schema-types'

export function ViewTabs() {
  const { state, dispatch } = useSchema()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const draggedIdRef = useRef<string | null>(null)
  const dragOverIdRef = useRef<string | null>(null)

  const setDragged = useCallback((value: string | null) => {
    draggedIdRef.current = value
    setDraggedId(value)
  }, [])

  const setDragOver = useCallback((value: string | null) => {
    dragOverIdRef.current = value
    setDragOverId(value)
  }, [])

  const reorderViews = useCallback(
    (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return
      const currentOrder = state.views.map((v) => v.id)
      const sourceIndex = currentOrder.indexOf(sourceId)
      const targetIndex = currentOrder.indexOf(targetId)
      if (sourceIndex === -1 || targetIndex === -1) return

      const newOrder = [...currentOrder]
      newOrder.splice(sourceIndex, 1)
      newOrder.splice(targetIndex, 0, sourceId)
      dispatch({ type: 'REORDER_VIEWS', viewIds: newOrder })
    },
    [dispatch, state.views]
  )

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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, viewId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', viewId)
    setDragged(viewId)
  }

  const handleDragOver = (e: React.DragEvent, viewId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (viewId !== draggedId) {
      setDragOver(viewId)
    }
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e: React.DragEvent, targetViewId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetViewId) {
      setDragged(null)
      setDragOver(null)
      return
    }

    reorderViews(draggedId, targetViewId)
    setDragged(null)
    setDragOver(null)
  }

  const handleDragEnd = () => {
    setDragged(null)
    setDragOver(null)
  }

  const handleTouchReorderStart = (e: React.TouchEvent, viewId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragged(viewId)
    setDragOver(null)

    const handleMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1 || !draggedIdRef.current) return
      moveEvent.preventDefault()

      const touch = moveEvent.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const tabElement = element?.closest('[data-view-tab-id]') as HTMLElement | null
      const targetViewId = tabElement?.dataset.viewTabId ?? null

      if (targetViewId && targetViewId !== draggedIdRef.current) {
        setDragOver(targetViewId)
      } else {
        setDragOver(null)
      }
    }

    const handleEnd = () => {
      const sourceId = draggedIdRef.current
      const targetId = dragOverIdRef.current
      if (sourceId && targetId && sourceId !== targetId) {
        reorderViews(sourceId, targetId)
      }

      setDragged(null)
      setDragOver(null)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }

    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)
  }

  return (
    <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1 overflow-x-auto">
      {state.views.map((view) => (
        <div
          key={view.id}
          data-view-tab-id={view.id}
          draggable={editingId !== view.id}
          onDragStart={(e) => handleDragStart(e, view.id)}
          onDragOver={(e) => handleDragOver(e, view.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, view.id)}
          onDragEnd={handleDragEnd}
          className={cn(
            'group flex items-center gap-1 rounded-md border px-2 py-1 text-sm cursor-pointer transition-all',
            view.id === state.activeViewId
              ? 'border-border bg-background text-foreground shadow-sm'
              : 'border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/35 hover:text-foreground',
            draggedId === view.id && 'opacity-50',
            dragOverId === view.id && draggedId !== view.id && 'ring-2 ring-primary ring-offset-1'
          )}
          onClick={() => {
            if (editingId !== view.id) {
              dispatch({ type: 'SWITCH_VIEW', viewId: view.id })
            }
          }}
        >
          <GripVertical 
            className={cn(
              'h-3 w-3 cursor-grab text-muted-foreground shrink-0',
              'opacity-60 transition-opacity',
              draggedId === view.id && 'cursor-grabbing'
            )}
            onTouchStart={(e) => handleTouchReorderStart(e, view.id)}
          />
          
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
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (view.id !== state.activeViewId) {
                    dispatch({ type: 'SWITCH_VIEW', viewId: view.id })
                    return
                  }
                  handleStartRename(view)
                }}
                className={cn(
                  'max-w-32 truncate rounded px-1 py-0.5 text-left transition-colors',
                  view.id === state.activeViewId
                    ? 'hover:bg-background hover:ring-1 hover:ring-border/80'
                    : 'hover:bg-transparent'
                )}
                title="Rename view"
              >
                {view.name}
              </button>
              {state.views.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete view "${view.name}"?`)) {
                      dispatch({ type: 'DELETE_VIEW', viewId: view.id })
                    }
                  }}
                  className="p-0.5 opacity-60 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
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
