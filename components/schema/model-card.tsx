'use client'

import { useRef, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Key, Link, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchema, generateId, getActiveView } from '@/lib/schema-store'
import type { Model, Field } from '@/lib/schema-types'
import { Button } from '@/components/ui/button'

interface ModelCardProps {
  model: Model
}

export function ModelCard({ model }: ModelCardProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const cardRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const draggedFieldIdRef = useRef<string | null>(null)
  const fieldDragOverIdRef = useRef<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null)
  const [fieldDragOverId, setFieldDragOverId] = useState<string | null>(null)

  const isSelected = state.selection?.type === 'model' && state.selection.modelId === model.id

  const setFieldDragged = useCallback((value: string | null) => {
    draggedFieldIdRef.current = value
    setDraggedFieldId(value)
  }, [])

  const setFieldDragOver = useCallback((value: string | null) => {
    fieldDragOverIdRef.current = value
    setFieldDragOverId(value)
  }, [])

  const reorderFields = useCallback(
    (sourceFieldId: string, targetFieldId: string) => {
      if (sourceFieldId === targetFieldId) return
      const currentOrder = model.fields.map((f) => f.id)
      const sourceIndex = currentOrder.indexOf(sourceFieldId)
      const targetIndex = currentOrder.indexOf(targetFieldId)
      if (sourceIndex === -1 || targetIndex === -1) return

      const nextOrder = [...currentOrder]
      nextOrder.splice(sourceIndex, 1)
      nextOrder.splice(targetIndex, 0, sourceFieldId)
      dispatch({ type: 'REORDER_FIELDS', modelId: model.id, fieldIds: nextOrder })
    },
    [dispatch, model.fields, model.id]
  )

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      const rect = cardRef.current?.getBoundingClientRect()
      const canvas = cardRef.current?.closest('[data-canvas]')
      if (!rect || !canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const scale = activeView.canvasScale

      isDraggingRef.current = true
      setIsDragging(true)
      dragOffsetRef.current = {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      }

      dispatch({ type: 'SET_SELECTION', selection: { type: 'model', modelId: model.id } })
    },
    [dispatch, model.id, activeView.canvasScale]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent): boolean => {
      if ((e.target as HTMLElement).closest('button')) return false
      if ((e.target as HTMLElement).closest('[data-field]')) return false

      e.preventDefault()
      startDrag(e.clientX, e.clientY)
      return true
    },
    [startDrag]
  )

  const moveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return

      const canvas = cardRef.current?.closest('[data-canvas]')
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const scale = activeView.canvasScale
      const newX = (clientX - canvasRect.left) / scale - dragOffsetRef.current.x - activeView.canvasOffset.x
      const newY = (clientY - canvasRect.top) / scale - dragOffsetRef.current.y - activeView.canvasOffset.y

      dispatch({
        type: 'MOVE_MODEL',
        modelId: model.id,
        position: { x: Math.max(0, newX), y: Math.max(0, newY) },
      })
    },
    [activeView.canvasScale, activeView.canvasOffset, dispatch, model.id]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      moveDrag(e.clientX, e.clientY)
    },
    [moveDrag]
  )

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
    setIsDragging(false)
  }, [])

  // Attach global listeners when dragging
  const handleMouseDownWrapper = useCallback(
    (e: React.MouseEvent) => {
      if (!handleMouseDown(e)) return

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
      if ((e.target as HTMLElement).closest('button')) return
      if ((e.target as HTMLElement).closest('[data-field]')) return
      if (e.touches.length !== 1) return

      e.preventDefault()
      e.stopPropagation()
      
      const touch = e.touches[0]
      const rect = cardRef.current?.getBoundingClientRect()
      const canvas = cardRef.current?.closest('[data-canvas]')
      if (!rect || !canvas) return

      const scale = activeView.canvasScale
      
      // Store the initial offset from touch point to card corner
      const initialOffsetX = (touch.clientX - rect.left) / scale
      const initialOffsetY = (touch.clientY - rect.top) / scale

      setIsDragging(true)
      isDraggingRef.current = true
      dragOffsetRef.current = { x: initialOffsetX, y: initialOffsetY }
      dispatch({ type: 'SET_SELECTION', selection: { type: 'model', modelId: model.id } })

      const handleMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length === 1) {
          moveEvent.preventDefault()
          moveEvent.stopPropagation()
          
          const moveTouch = moveEvent.touches[0]
          const canvasRect = canvas.getBoundingClientRect()
          const currentScale = activeView.canvasScale
          
          // Use the stored initial offset, not recalculated
          const newX = (moveTouch.clientX - canvasRect.left) / currentScale - initialOffsetX - activeView.canvasOffset.x
          const newY = (moveTouch.clientY - canvasRect.top) / currentScale - initialOffsetY - activeView.canvasOffset.y

          dispatch({
            type: 'MOVE_MODEL',
            modelId: model.id,
            position: { x: Math.max(0, newX), y: Math.max(0, newY) },
          })
        }
      }
      
      const handleEnd = () => {
        setIsDragging(false)
        isDraggingRef.current = false
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('touchend', handleEnd)
        window.removeEventListener('touchcancel', handleEnd)
      }

      window.addEventListener('touchmove', handleMove, { passive: false })
      window.addEventListener('touchend', handleEnd)
      window.addEventListener('touchcancel', handleEnd)
    },
    [activeView.canvasScale, activeView.canvasOffset, dispatch, model.id]
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

  const handleFieldDragStart = (e: React.DragEvent<HTMLDivElement>, fieldId: string) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', fieldId)
    setFieldDragged(fieldId)
    setFieldDragOver(null)
  }

  const handleFieldDragOver = (e: React.DragEvent<HTMLDivElement>, fieldId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (fieldId !== draggedFieldIdRef.current) {
      setFieldDragOver(fieldId)
    }
  }

  const handleFieldDrop = (e: React.DragEvent<HTMLDivElement>, targetFieldId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceFieldId = draggedFieldIdRef.current
    if (sourceFieldId && sourceFieldId !== targetFieldId) {
      reorderFields(sourceFieldId, targetFieldId)
    }
    setFieldDragged(null)
    setFieldDragOver(null)
  }

  const handleFieldDragEnd = () => {
    setFieldDragged(null)
    setFieldDragOver(null)
  }

  const handleFieldTouchReorderStart = (e: React.TouchEvent, fieldId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFieldDragged(fieldId)
    setFieldDragOver(null)

    const handleMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1 || !draggedFieldIdRef.current) return
      moveEvent.preventDefault()
      moveEvent.stopPropagation()

      const touch = moveEvent.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      const fieldElement = element?.closest('[data-field]') as HTMLElement | null
      const targetModelId = fieldElement?.dataset.modelId
      const targetFieldId = fieldElement?.dataset.fieldId

      if (targetModelId === model.id && targetFieldId && targetFieldId !== draggedFieldIdRef.current) {
        setFieldDragOver(targetFieldId)
      } else {
        setFieldDragOver(null)
      }
    }

    const handleEnd = () => {
      const sourceFieldId = draggedFieldIdRef.current
      const targetFieldId = fieldDragOverIdRef.current
      if (sourceFieldId && targetFieldId && sourceFieldId !== targetFieldId) {
        reorderFields(sourceFieldId, targetFieldId)
      }

      setFieldDragged(null)
      setFieldDragOver(null)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
      window.removeEventListener('touchcancel', handleEnd)
    }

    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
    window.addEventListener('touchcancel', handleEnd)
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
        touchAction: 'none',
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
                draggable
                onDragStart={(e) => handleFieldDragStart(e, field.id)}
                onDragOver={(e) => handleFieldDragOver(e, field.id)}
                onDrop={(e) => handleFieldDrop(e, field.id)}
                onDragEnd={handleFieldDragEnd}
                onClick={(e) => handleFieldClick(field, e)}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer transition-colors',
                  isFieldSelected
                    ? 'bg-primary/20 text-foreground'
                    : 'hover:bg-secondary text-foreground',
                  draggedFieldId === field.id && 'opacity-50',
                  fieldDragOverId === field.id && draggedFieldId !== field.id && 'ring-2 ring-primary/60'
                )}
              >
                <GripVertical
                  className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab"
                  onTouchStart={(e) => handleFieldTouchReorderStart(e, field.id)}
                />
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
