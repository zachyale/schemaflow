'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Settings2, Trash2, X } from 'lucide-react'
import { useSchema, getActiveView, generateId } from '@/lib/schema-store'
import { FIELD_TYPES } from '@/lib/schema-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

type InspectorNode =
  | { type: 'model'; modelId: string }
  | { type: 'field'; modelId: string; fieldId: string }

interface InspectorPanelProps {
  onAddRelationshipFromModel?: (modelId: string) => void
  onClose?: () => void
}

export function InspectorPanel({ onAddRelationshipFromModel, onClose }: InspectorPanelProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const [stack, setStack] = useState<InspectorNode[]>([])

  useEffect(() => {
    if (!state.selection) {
      setStack([])
      return
    }

    if (state.selection.type === 'model') {
      setStack([{ type: 'model', modelId: state.selection.modelId }])
      return
    }

    if (state.selection.type === 'field') {
      setStack([
        { type: 'model', modelId: state.selection.modelId },
        { type: 'field', modelId: state.selection.modelId, fieldId: state.selection.fieldId },
      ])
      return
    }

    setStack([])
  }, [state.selection])

  const currentNode = stack[stack.length - 1]

  const currentModel = useMemo(() => {
    if (!currentNode) return null
    const modelId = currentNode.modelId
    return activeView.schema.models.find((m) => m.id === modelId) ?? null
  }, [activeView.schema.models, currentNode])

  const relatedTableLinks = useMemo(() => {
    if (!currentModel) return []

    return activeView.schema.relationships
      .filter(
        (rel) => rel.fromModelId === currentModel.id || rel.toModelId === currentModel.id
      )
      .map((rel) => {
        const isOutgoing = rel.fromModelId === currentModel.id
        const relatedModelId = isOutgoing ? rel.toModelId : rel.fromModelId
        const relatedFieldId = isOutgoing ? rel.toFieldId : rel.fromFieldId
        const localFieldId = isOutgoing ? rel.fromFieldId : rel.toFieldId

        const relatedModel = activeView.schema.models.find((m) => m.id === relatedModelId)
        const localField = currentModel.fields.find((f) => f.id === localFieldId)
        const relatedField = relatedModel?.fields.find((f) => f.id === relatedFieldId)

        if (!relatedModel) return null

        return {
          id: rel.id,
          label: relatedModel.name,
          relationLabel: `${localField?.name ?? 'field'} -> ${relatedField?.name ?? 'field'}`,
          relatedModelId,
          relatedFieldId,
          direction: isOutgoing ? 'outgoing' : 'incoming',
        }
      })
      .filter(Boolean) as Array<{
      id: string
      label: string
      relationLabel: string
      relatedModelId: string
      relatedFieldId: string
      direction: 'outgoing' | 'incoming'
    }>
  }, [activeView.schema.models, activeView.schema.relationships, currentModel])

  if (!currentNode || !currentModel) {
    return null
  }

  if (currentNode.type === 'model') {
    return (
      <div className="w-72 border-l bg-card flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Table Details</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={onClose}
            aria-label="Close table details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Name</Label>
              <Input
                id="model-name"
                value={currentModel.name}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_MODEL',
                    modelId: currentModel.id,
                    updates: { name: e.target.value },
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Columns ({currentModel.fields.length})
              </Label>
              <div className="space-y-1">
                {currentModel.fields.map((field) => (
                  <button
                    key={field.id}
                    className="group flex w-full items-center gap-2 rounded-md border border-border/70 bg-secondary/30 px-2.5 py-1.5 text-sm text-left transition-colors hover:border-border hover:bg-secondary/60"
                    onClick={() => {
                      dispatch({
                        type: 'SET_SELECTION',
                        selection: { type: 'field', modelId: currentModel.id, fieldId: field.id },
                      })
                    }}
                  >
                    <span className="flex-1 font-medium">{field.name}</span>
                    <span className="text-xs text-muted-foreground">{field.type}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
                <button
                  className="flex w-full items-center gap-2 rounded-md border border-dashed border-border/80 bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-secondary/40 hover:text-foreground"
                  onClick={() => {
                    const fieldId = generateId('field')
                    dispatch({
                      type: 'ADD_FIELD',
                      modelId: currentModel.id,
                      field: {
                        id: fieldId,
                        name: 'newField',
                        type: 'string',
                      },
                    })
                    dispatch({
                      type: 'SET_SELECTION',
                      selection: { type: 'field', modelId: currentModel.id, fieldId },
                    })
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="font-medium">Add Field</span>
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Related Tables ({relatedTableLinks.length})
              </Label>
              {relatedTableLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No related tables.</p>
              ) : (
                <div className="space-y-1">
                  {relatedTableLinks.map((item) => (
                    <button
                      key={item.id}
                      className="group flex w-full items-start gap-2 rounded-md border border-border/70 bg-secondary/30 px-2.5 py-1.5 text-left transition-colors hover:border-border hover:bg-secondary/60"
                      onClick={() => {
                        const relatedModel = activeView.schema.models.find((m) => m.id === item.relatedModelId)
                        const hasField = relatedModel?.fields.some((f) => f.id === item.relatedFieldId)
                        if (hasField) {
                          dispatch({
                            type: 'SET_SELECTION',
                            selection: {
                              type: 'field',
                              modelId: item.relatedModelId,
                              fieldId: item.relatedFieldId,
                            },
                          })
                        } else {
                          dispatch({
                            type: 'SET_SELECTION',
                            selection: { type: 'model', modelId: item.relatedModelId },
                          })
                        }
                      }}
                    >
                      <div className="flex-1">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {item.direction === 'outgoing' ? 'references' : 'referenced by'}: {item.relationLabel}
                        </span>
                      </div>
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              )}
              <button
                className="mt-1 flex w-full items-center gap-2 rounded-md border border-dashed border-border/80 bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-secondary/40 hover:text-foreground"
                onClick={() => onAddRelationshipFromModel?.(currentModel.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="font-medium">Add Relationship</span>
              </button>
            </div>

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                if (confirm(`Delete model "${currentModel.name}" and all its relationships?`)) {
                  dispatch({ type: 'DELETE_MODEL', modelId: currentModel.id })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Table
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentField = currentModel.fields.find((f) => f.id === currentNode.fieldId)
  if (!currentField) return null

  return (
    <div className="w-72 border-l bg-card flex flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() =>
            dispatch({
              type: 'SET_SELECTION',
              selection: { type: 'model', modelId: currentModel.id },
            })
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Settings2 className="h-4 w-4 text-muted-foreground ml-1" />
        <span className="text-sm font-medium">Column Details</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={onClose}
          aria-label="Close table details"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="rounded bg-secondary/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Table:</span>{' '}
            <span className="font-medium">{currentModel.name}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-name">Name</Label>
            <Input
              id="field-name"
              value={currentField.name}
              onChange={(e) =>
                dispatch({
                  type: 'UPDATE_FIELD',
                  modelId: currentModel.id,
                  fieldId: currentField.id,
                  updates: { name: e.target.value },
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Type</Label>
            <Select
              value={currentField.type}
              onValueChange={(value) =>
                dispatch({
                  type: 'UPDATE_FIELD',
                  modelId: currentModel.id,
                  fieldId: currentField.id,
                  updates: { type: value },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs">Flags</Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="primary-key" className="text-sm cursor-pointer">
                Primary Key
              </Label>
              <Switch
                id="primary-key"
                checked={currentField.primaryKey || false}
                onCheckedChange={(checked) =>
                  dispatch({
                    type: 'UPDATE_FIELD',
                    modelId: currentModel.id,
                    fieldId: currentField.id,
                    updates: { primaryKey: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="foreign-key" className="text-sm cursor-pointer">
                Foreign Key
              </Label>
              <Switch
                id="foreign-key"
                checked={currentField.foreignKey || false}
                onCheckedChange={(checked) =>
                  dispatch({
                    type: 'UPDATE_FIELD',
                    modelId: currentModel.id,
                    fieldId: currentField.id,
                    updates: { foreignKey: checked },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="nullable" className="text-sm cursor-pointer">
                Nullable
              </Label>
              <Switch
                id="nullable"
                checked={currentField.nullable || false}
                onCheckedChange={(checked) =>
                  dispatch({
                    type: 'UPDATE_FIELD',
                    modelId: currentModel.id,
                    fieldId: currentField.id,
                    updates: { nullable: checked },
                  })
                }
              />
            </div>
          </div>

          <Separator />

          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => {
              if (confirm(`Delete field "${currentField.name}"? Related relationships will also be deleted.`)) {
                dispatch({ type: 'DELETE_FIELD', modelId: currentModel.id, fieldId: currentField.id })
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Column
          </Button>
        </div>
      </div>
    </div>
  )
}
