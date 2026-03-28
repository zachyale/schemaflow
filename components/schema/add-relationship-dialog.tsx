'use client'

import { useState, useMemo } from 'react'
import { useSchema, generateId } from '@/lib/schema-store'
import { RELATIONSHIP_TYPES } from '@/lib/schema-types'
import type { RelationshipType, Relationship } from '@/lib/schema-types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AddRelationshipDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRelationshipDialog({ open, onOpenChange }: AddRelationshipDialogProps) {
  const { state, dispatch } = useSchema()
  const [fromModelId, setFromModelId] = useState('')
  const [fromFieldId, setFromFieldId] = useState('')
  const [toModelId, setToModelId] = useState('')
  const [toFieldId, setToFieldId] = useState('')
  const [type, setType] = useState<RelationshipType>('many-to-one')

  const fromModel = state.schema.models.find((m) => m.id === fromModelId)
  const toModel = state.schema.models.find((m) => m.id === toModelId)

  const fromFields = useMemo(() => fromModel?.fields || [], [fromModel])
  const toFields = useMemo(() => toModel?.fields || [], [toModel])

  const canCreate =
    fromModelId &&
    fromFieldId &&
    toModelId &&
    toFieldId &&
    (fromModelId !== toModelId || fromFieldId !== toFieldId)

  const handleCreate = () => {
    if (!canCreate) return

    const newRelationship: Relationship = {
      id: generateId('rel'),
      fromModelId,
      fromFieldId,
      toModelId,
      toFieldId,
      type,
    }

    dispatch({ type: 'ADD_RELATIONSHIP', relationship: newRelationship })
    dispatch({
      type: 'SET_SELECTION',
      selection: { type: 'relationship', relationshipId: newRelationship.id },
    })

    // Reset form
    setFromModelId('')
    setFromFieldId('')
    setToModelId('')
    setToFieldId('')
    setType('many-to-one')
    onOpenChange(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form on close
      setFromModelId('')
      setFromFieldId('')
      setToModelId('')
      setToFieldId('')
      setType('many-to-one')
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
          <DialogDescription>
            Create a relationship between two fields in your schema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Model</Label>
              <Select value={fromModelId} onValueChange={(v) => { setFromModelId(v); setFromFieldId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {state.schema.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Field</Label>
              <Select value={fromFieldId} onValueChange={setFromFieldId} disabled={!fromModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {fromFields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RelationshipType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>To Model</Label>
              <Select value={toModelId} onValueChange={(v) => { setToModelId(v); setToFieldId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {state.schema.models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Field</Label>
              <Select value={toFieldId} onValueChange={setToFieldId} disabled={!toModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {toFields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate}>
            Create Relationship
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
