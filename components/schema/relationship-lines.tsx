'use client'

import { useMemo } from 'react'
import { useSchema, getActiveView } from '@/lib/schema-store'
import type { Model, Relationship } from '@/lib/schema-types'

function getFieldPositionFromIndex(
  model: Model,
  fieldIndex: number,
  side: 'left' | 'right'
): { x: number; y: number } | null {
  if (fieldIndex === -1) return null

  const cardWidth = 240
  const headerHeight = 44
  const fieldHeight = 32
  
  // If collapsed, connect to the header center
  const fieldOffset = model.collapsed 
    ? headerHeight / 2 
    : headerHeight + fieldIndex * fieldHeight + fieldHeight / 2

  return {
    x: side === 'left' ? model.position.x : model.position.x + cardWidth,
    y: model.position.y + fieldOffset,
  }
}

interface RelationshipLineProps {
  relationship: Relationship
  fromModel: Model
  toModel: Model
  fromFieldIndex: number
  toFieldIndex: number
  isSelected: boolean
  onSelect: (relationshipId: string) => void
}

function RelationshipLine({
  relationship,
  fromModel,
  toModel,
  fromFieldIndex,
  toFieldIndex,
  isSelected,
  onSelect,
}: RelationshipLineProps) {
  // Determine which side to connect from
  const fromIsLeft = fromModel.position.x > toModel.position.x
  const toIsLeft = !fromIsLeft

  const fromPos = getFieldPositionFromIndex(fromModel, fromFieldIndex, fromIsLeft ? 'left' : 'right')
  const toPos = getFieldPositionFromIndex(toModel, toFieldIndex, toIsLeft ? 'left' : 'right')

  if (!fromPos || !toPos) return null

  // Calculate control points for bezier curve
  const dx = Math.abs(toPos.x - fromPos.x)
  const controlOffset = Math.min(dx * 0.5, 100)

  const controlX1 = fromIsLeft ? fromPos.x - controlOffset : fromPos.x + controlOffset
  const controlX2 = toIsLeft ? toPos.x - controlOffset : toPos.x + controlOffset

  const path = `M ${fromPos.x} ${fromPos.y} C ${controlX1} ${fromPos.y}, ${controlX2} ${toPos.y}, ${toPos.x} ${toPos.y}`

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(relationship.id)
  }

  // Relationship type indicators
  const showFromMany = relationship.type === 'many-to-one' || relationship.type === 'many-to-many'
  const showToMany = relationship.type === 'one-to-many' || relationship.type === 'many-to-many'

  return (
    <g onClick={handleClick} className="cursor-pointer">
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="pointer-events-stroke"
      />
      {/* Visible path */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? 'var(--primary)' : 'var(--muted-foreground)'}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeDasharray={isSelected ? undefined : '4 2'}
        className="transition-all pointer-events-none"
      />
      {/* From end marker */}
      {showFromMany && (
        <g transform={`translate(${fromPos.x}, ${fromPos.y})`}>
          <circle
            r={4}
            fill="var(--background)"
            stroke={isSelected ? 'var(--primary)' : 'var(--muted-foreground)'}
            strokeWidth={1.5}
          />
        </g>
      )}
      {!showFromMany && (
        <circle
          cx={fromPos.x}
          cy={fromPos.y}
          r={3}
          fill={isSelected ? 'var(--primary)' : 'var(--muted-foreground)'}
        />
      )}
      {/* To end marker */}
      {showToMany && (
        <g transform={`translate(${toPos.x}, ${toPos.y})`}>
          <circle
            r={4}
            fill="var(--background)"
            stroke={isSelected ? 'var(--primary)' : 'var(--muted-foreground)'}
            strokeWidth={1.5}
          />
        </g>
      )}
      {!showToMany && (
        <circle
          cx={toPos.x}
          cy={toPos.y}
          r={3}
          fill={isSelected ? 'var(--primary)' : 'var(--muted-foreground)'}
        />
      )}
    </g>
  )
}

interface RelationshipLinesProps {
  visibleModelIds?: Set<string>
}

export function RelationshipLines({ visibleModelIds }: RelationshipLinesProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const selectedRelationshipId =
    state.selection?.type === 'relationship' ? state.selection.relationshipId : null

  const { modelById, fieldIndexByModelId } = useMemo(() => {
    const models = activeView.schema.models
    const byId = new Map<string, Model>()
    const fieldIndexes = new Map<string, Map<string, number>>()

    for (const model of models) {
      byId.set(model.id, model)
      fieldIndexes.set(
        model.id,
        new Map(model.fields.map((field, index) => [field.id, index]))
      )
    }

    return {
      modelById: byId,
      fieldIndexByModelId: fieldIndexes,
    }
  }, [activeView.schema.models])

  const handleSelect = (relationshipId: string) => {
    dispatch({
      type: 'SET_SELECTION',
      selection: { type: 'relationship', relationshipId },
    })
  }

  return (
    <>
      {activeView.schema.relationships.map((relationship) => {
        if (
          visibleModelIds &&
          !visibleModelIds.has(relationship.fromModelId) &&
          !visibleModelIds.has(relationship.toModelId)
        ) {
          return null
        }

        const fromModel = modelById.get(relationship.fromModelId)
        const toModel = modelById.get(relationship.toModelId)

        if (!fromModel || !toModel) return null

        const fromFieldIndex =
          fieldIndexByModelId.get(fromModel.id)?.get(relationship.fromFieldId) ?? -1
        const toFieldIndex =
          fieldIndexByModelId.get(toModel.id)?.get(relationship.toFieldId) ?? -1
        if (fromFieldIndex === -1 || toFieldIndex === -1) return null

        return (
          <RelationshipLine
            key={relationship.id}
            relationship={relationship}
            fromModel={fromModel}
            toModel={toModel}
            fromFieldIndex={fromFieldIndex}
            toFieldIndex={toFieldIndex}
            isSelected={selectedRelationshipId === relationship.id}
            onSelect={handleSelect}
          />
        )
      })}
    </>
  )
}
