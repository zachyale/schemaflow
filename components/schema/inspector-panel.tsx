'use client'

import { Settings2, Trash2 } from 'lucide-react'
import { useSchema } from '@/lib/schema-store'
import { FIELD_TYPES, RELATIONSHIP_TYPES } from '@/lib/schema-types'
import type { RelationshipType } from '@/lib/schema-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function InspectorPanel() {
  const { state, dispatch } = useSchema()

  if (!state.selection) {
    return (
      <div className="w-72 border-l bg-card flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Inspector</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select a model, field, or relationship to edit its properties.
          </p>
        </div>
      </div>
    )
  }

  if (state.selection.type === 'model') {
    const model = state.schema.models.find((m) => m.id === state.selection?.modelId)
    if (!model) return null

    return (
      <div className="w-72 border-l bg-card flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Model Properties</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Name</Label>
              <Input
                id="model-name"
                value={model.name}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_MODEL',
                    modelId: model.id,
                    updates: { name: e.target.value },
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Position</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="pos-x" className="text-xs">X</Label>
                  <Input
                    id="pos-x"
                    type="number"
                    value={Math.round(model.position.x)}
                    onChange={(e) =>
                      dispatch({
                        type: 'MOVE_MODEL',
                        modelId: model.id,
                        position: { ...model.position, x: parseInt(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="pos-y" className="text-xs">Y</Label>
                  <Input
                    id="pos-y"
                    type="number"
                    value={Math.round(model.position.y)}
                    onChange={(e) =>
                      dispatch({
                        type: 'MOVE_MODEL',
                        modelId: model.id,
                        position: { ...model.position, y: parseInt(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">
                Fields ({model.fields.length})
              </Label>
              <div className="space-y-1">
                {model.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded bg-secondary/50 px-2 py-1 text-sm"
                  >
                    <span>{field.name}</span>
                    <span className="text-xs text-muted-foreground">{field.type}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                if (confirm(`Delete model "${model.name}" and all its relationships?`)) {
                  dispatch({ type: 'DELETE_MODEL', modelId: model.id })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Model
            </Button>
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (state.selection.type === 'field') {
    const model = state.schema.models.find((m) => m.id === state.selection?.modelId)
    const field = model?.fields.find((f) => f.id === (state.selection as { fieldId: string }).fieldId)
    if (!model || !field) return null

    return (
      <div className="w-72 border-l bg-card flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Field Properties</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="rounded bg-secondary/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Model:</span>{' '}
              <span className="font-medium">{model.name}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-name">Name</Label>
              <Input
                id="field-name"
                value={field.name}
                onChange={(e) =>
                  dispatch({
                    type: 'UPDATE_FIELD',
                    modelId: model.id,
                    fieldId: field.id,
                    updates: { name: e.target.value },
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Type</Label>
              <Select
                value={field.type}
                onValueChange={(value) =>
                  dispatch({
                    type: 'UPDATE_FIELD',
                    modelId: model.id,
                    fieldId: field.id,
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
                  checked={field.primaryKey || false}
                  onCheckedChange={(checked) =>
                    dispatch({
                      type: 'UPDATE_FIELD',
                      modelId: model.id,
                      fieldId: field.id,
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
                  checked={field.foreignKey || false}
                  onCheckedChange={(checked) =>
                    dispatch({
                      type: 'UPDATE_FIELD',
                      modelId: model.id,
                      fieldId: field.id,
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
                  checked={field.nullable || false}
                  onCheckedChange={(checked) =>
                    dispatch({
                      type: 'UPDATE_FIELD',
                      modelId: model.id,
                      fieldId: field.id,
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
                if (confirm(`Delete field "${field.name}"? Related relationships will also be deleted.`)) {
                  dispatch({ type: 'DELETE_FIELD', modelId: model.id, fieldId: field.id })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Field
            </Button>
          </div>
        </ScrollArea>
      </div>
    )
  }

  if (state.selection.type === 'relationship') {
    const relationship = state.schema.relationships.find(
      (r) => r.id === (state.selection as { relationshipId: string }).relationshipId
    )
    if (!relationship) return null

    const fromModel = state.schema.models.find((m) => m.id === relationship.fromModelId)
    const toModel = state.schema.models.find((m) => m.id === relationship.toModelId)
    const fromField = fromModel?.fields.find((f) => f.id === relationship.fromFieldId)
    const toField = toModel?.fields.find((f) => f.id === relationship.toFieldId)

    return (
      <div className="w-72 border-l bg-card flex flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Relationship</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <div className="rounded bg-secondary/50 px-3 py-2 space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">From:</span>{' '}
                <span className="font-medium">{fromModel?.name}.{fromField?.name}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">To:</span>{' '}
                <span className="font-medium">{toModel?.name}.{toField?.name}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rel-type">Type</Label>
              <Select
                value={relationship.type}
                onValueChange={(value) =>
                  dispatch({
                    type: 'UPDATE_RELATIONSHIP',
                    relationshipId: relationship.id,
                    updates: { type: value as RelationshipType },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => {
                if (confirm('Delete this relationship?')) {
                  dispatch({ type: 'DELETE_RELATIONSHIP', relationshipId: relationship.id })
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Relationship
            </Button>
          </div>
        </ScrollArea>
      </div>
    )
  }

  return null
}
