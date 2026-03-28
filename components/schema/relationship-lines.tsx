'use client'

import { useSchema } from '@/lib/schema-store'
import type { Model, Relationship } from '@/lib/schema-types'

function getFieldPosition(
  model: Model,
  fieldId: string,
  side: 'left' | 'right'
): { x: number; y: number } | null {
  const fieldIndex = model.fields.findIndex((f) => f.id === fieldId)
  if (fieldIndex === -1) return null

  const cardWidth = 240
  const headerHeight = 44
  const fieldHeight = 32
  const fieldOffset = headerHeight + fieldIndex * fieldHeight + fieldHeight / 2

  return {
    x: side === 'left' ? model.position.x : model.position.x + cardWidth,
    y: model.position.y + fieldOffset,
  }
}

interface RelationshipLineProps {
  relationship: Relationship
  fromModel: Model
  toModel: Model
}

function RelationshipLine({ relationship, fromModel, toModel }: RelationshipLineProps) {
  const { state, dispatch } = useSchema()

  // Determine which side to connect from
  const fromIsLeft = fromModel.position.x > toModel.position.x
  const toIsLeft = !fromIsLeft

  const fromPos = getFieldPosition(fromModel, relationship.fromFieldId, fromIsLeft ? 'left' : 'right')
  const toPos = getFieldPosition(toModel, relationship.toFieldId, toIsLeft ? 'left' : 'right')

  if (!fromPos || !toPos) return null

  // Calculate control points for bezier curve
  const dx = Math.abs(toPos.x - fromPos.x)
  const controlOffset = Math.min(dx * 0.5, 100)

  const controlX1 = fromIsLeft ? fromPos.x - controlOffset : fromPos.x + controlOffset
  const controlX2 = toIsLeft ? toPos.x - controlOffset : toPos.x + controlOffset

  const path = `M ${fromPos.x} ${fromPos.y} C ${controlX1} ${fromPos.y}, ${controlX2} ${toPos.y}, ${toPos.x} ${toPos.y}`

  const isSelected =
    state.selection?.type === 'relationship' && state.selection.relationshipId === relationship.id

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({
      type: 'SET_SELECTION',
      selection: { type: 'relationship', relationshipId: relationship.id },
    })
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

export function RelationshipLines() {
  const { state } = useSchema()

  return (
    <>
      {state.schema.relationships.map((relationship) => {
        const fromModel = state.schema.models.find((m) => m.id === relationship.fromModelId)
        const toModel = state.schema.models.find((m) => m.id === relationship.toModelId)

        if (!fromModel || !toModel) return null

        return (
          <RelationshipLine
            key={relationship.id}
            relationship={relationship}
            fromModel={fromModel}
            toModel={toModel}
          />
        )
      })}
    </>
  )
}
