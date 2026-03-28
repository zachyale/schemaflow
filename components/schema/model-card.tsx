'use client'

import { useRef, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Key, Link, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchema, generateId } from '@/lib/schema-store'
import type { Model, Field } from '@/lib/schema-types'
import { Button } from '@/components/ui/button'

interface ModelCardProps {
  model: Model
}

export function ModelCard({ model }: ModelCardProps) {
  const { state, dispatch } = useSchema()
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const isSelected = state.selection?.type === 'model' && state.selection.modelId === model.id

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      const rect = cardRef.current?.getBoundingClientRect()
      const canvas = cardRef.current?.closest('[data-canvas]')
      if (!rect || !canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const scale = state.canvasScale

      setIsDragging(true)
      setDragOffset({
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      })

      dispatch({ type: 'SET_SELECTION', selection: { type: 'model', modelId: model.id } })
    },
    [dispatch, model.id, state.canvasScale]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      if ((e.target as HTMLElement).closest('[data-field]')) return

      e.preventDefault()
      startDrag(e.clientX, e.clientY)
    },
    [startDrag]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('button')) return
      if ((e.target as HTMLElement).closest('[data-field]')) return

      // Only handle single touch for dragging
      if (e.touches.length === 1) {
        e.preventDefault()
        const touch = e.touches[0]
        startDrag(touch.clientX, touch.clientY)
      }
    },
    [startDrag]
  )

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return

      const canvas = cardRef.current?.closest('[data-canvas]')
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const scale = state.canvasScale
      const newX = (clientX - canvasRect.left) / scale - dragOffset.x - state.canvasOffset.x
      const newY = (clientY - canvasRect.top) / scale - dragOffset.y - state.canvasOffset.y

      dispatch({
        type: 'MOVE_MODEL',
        modelId: model.id,
        position: { x: Math.max(0, newX), y: Math.max(0, newY) },
      })
    },
    [isDragging, state.canvasScale, dragOffset, state.canvasOffset, dispatch, model.id]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      moveDrag(e.clientX, e.clientY)
    },
    [moveDrag]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault()
        const touch = e.touches[0]
        moveDrag(touch.clientX, touch.clientY)
      }
    },
    [moveDrag]
  )

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Attach global listeners when dragging
  const handleMouseDownWrapper = useCallback(
    (e: React.MouseEvent) => {
      handleMouseDown(e)

      const handleMove = (e: MouseEvent) => handleMouseMove(e)
      const handleUp = () => {
        handleDragEnd()
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [handleMouseDown, handleMouseMove, handleDragEnd]
  )

  const handleTouchStartWrapper = useCallback(
    (e: React.TouchEvent) => {
      handleTouchStart(e)

      const handleMove = (e: TouchEvent) => handleTouchMove(e)
      const handleEnd = () => {
        handleDragEnd()
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
      }

      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
    },
    [handleTouchStart, handleTouchMove, handleDragEnd]
  )

  const handleAddField = () => {
    const newField: Field = {
      id: generateId('field'),
      name: 'newField',
      type: 'string',
    }
    dispatch({ type: 'ADD_FIELD', modelId: model.id, field: newField })
    dispatch({
      type: 'SET_SELECTION',
      selection: { type: 'field', modelId: model.id, fieldId: newField.id },
    })
  }

  const handleFieldClick = (field: Field, e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'SET_SELECTION',
      selection: { type: 'field', modelId: model.id, fieldId: field.id },
    })
  }

  const handleDeleteModel = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete model "${model.name}" and all its relationships?`)) {
      dispatch({ type: 'DELETE_MODEL', modelId: model.id })
    }
  }

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'TOGGLE_MODEL_COLLAPSE', modelId: model.id })
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'absolute min-w-[240px] rounded-lg border bg-card shadow-lg transition-shadow select-none',
        isSelected && 'ring-2 ring-primary shadow-xl',
        isDragging ? 'cursor-grabbing z-50 shadow-2xl' : 'cursor-grab'
      )}
      style={{
        left: model.position.x,
        top: model.position.y,
      }}
      onMouseDown={handleMouseDownWrapper}
      onTouchStart={handleTouchStartWrapper}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-secondary/50 px-3 py-2 rounded-t-lg cursor-grab">
        <button
          onClick={handleToggleCollapse}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {model.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span className="font-semibold text-foreground flex-1">{model.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={handleDeleteModel}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Fields */}
      {!model.collapsed && (
        <div className="p-1">
          {model.fields.map((field) => {
            const isFieldSelected =
              state.selection?.type === 'field' &&
              state.selection.modelId === model.id &&
              state.selection.fieldId === field.id

            return (
              <div
                key={field.id}
                data-field
                data-field-id={field.id}
                data-model-id={model.id}
                onClick={(e) => handleFieldClick(field, e)}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer transition-colors',
                  isFieldSelected
                    ? 'bg-primary/20 text-foreground'
                    : 'hover:bg-secondary text-foreground'
                )}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab" />
                <span className="flex-1 font-medium">{field.name}</span>
                <span className="text-xs text-muted-foreground">{field.type}</span>
                <div className="flex items-center gap-1">
                  {field.primaryKey && (
                    <Key className="h-3 w-3 text-primary" title="Primary Key" />
                  )}
                  {field.foreignKey && (
                    <Link className="h-3 w-3 text-accent" title="Foreign Key" />
                  )}
                </div>
              </div>
            )
          })}

          {/* Add Field Button */}
          <button
            onClick={handleAddField}
            className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border px-2 py-1.5 mt-1 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Field
          </button>
        </div>
      )}
    </div>
  )
}
