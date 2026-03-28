'use client'

import { createContext, useContext } from 'react'
import type { Schema, Model, Field, Relationship, Position, RelationshipType, SchemaView } from './schema-types'
import { DEFAULT_SCHEMA, DEFAULT_VIEW_ID } from './schema-types'

const STORAGE_KEY = 'schemaflow-session'

export type Selection =
  | { type: 'model'; modelId: string }
  | { type: 'field'; modelId: string; fieldId: string }
  | { type: 'relationship'; relationshipId: string }
  | null

export interface SchemaState {
  views: SchemaView[]
  activeViewId: string
  selection: Selection
}

// Helper to get active view's schema
export function getActiveView(state: SchemaState): SchemaView {
  return state.views.find(v => v.id === state.activeViewId) || state.views[0]
}

export type SchemaAction =
  | { type: 'SET_SCHEMA'; schema: Schema }
  | { type: 'SET_SELECTION'; selection: Selection }
  | { type: 'SET_CANVAS_OFFSET'; offset: Position }
  | { type: 'SET_CANVAS_SCALE'; scale: number }
  | { type: 'ADD_MODEL'; model: Model }
  | { type: 'UPDATE_MODEL'; modelId: string; updates: Partial<Omit<Model, 'id' | 'fields'>> }
  | { type: 'DELETE_MODEL'; modelId: string }
  | { type: 'MOVE_MODEL'; modelId: string; position: Position }
  | { type: 'TOGGLE_MODEL_COLLAPSE'; modelId: string }
  | { type: 'ADD_FIELD'; modelId: string; field: Field }
  | { type: 'UPDATE_FIELD'; modelId: string; fieldId: string; updates: Partial<Omit<Field, 'id'>> }
  | { type: 'DELETE_FIELD'; modelId: string; fieldId: string }
  | { type: 'MOVE_FIELD'; fromModelId: string; toModelId: string; fieldId: string; newIndex: number }
  | { type: 'REORDER_FIELDS'; modelId: string; fieldIds: string[] }
  | { type: 'ADD_RELATIONSHIP'; relationship: Relationship }
  | { type: 'UPDATE_RELATIONSHIP'; relationshipId: string; updates: Partial<Omit<Relationship, 'id'>> }
  | { type: 'DELETE_RELATIONSHIP'; relationshipId: string }
  | { type: 'RESET_LAYOUT' }
  // View actions
  | { type: 'ADD_VIEW'; view: SchemaView }
  | { type: 'DELETE_VIEW'; viewId: string }
  | { type: 'RENAME_VIEW'; viewId: string; name: string }
  | { type: 'SWITCH_VIEW'; viewId: string }
  | { type: 'LOAD_STATE'; state: SchemaState }

const defaultView: SchemaView = {
  id: DEFAULT_VIEW_ID,
  name: 'Default',
  schema: DEFAULT_SCHEMA,
  canvasOffset: { x: 0, y: 0 },
  canvasScale: 1,
}

export const initialState: SchemaState = {
  views: [defaultView],
  activeViewId: DEFAULT_VIEW_ID,
  selection: null,
}

// Helper to update active view
function updateActiveView(state: SchemaState, updater: (view: SchemaView) => SchemaView): SchemaState {
  return {
    ...state,
    views: state.views.map(v => v.id === state.activeViewId ? updater(v) : v),
  }
}

export function schemaReducer(state: SchemaState, action: SchemaAction): SchemaState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.state

    case 'SET_SCHEMA':
      return updateActiveView(state, v => ({ ...v, schema: action.schema }))

    case 'SET_SELECTION':
      return { ...state, selection: action.selection }

    case 'SET_CANVAS_OFFSET':
      return updateActiveView(state, v => ({ ...v, canvasOffset: action.offset }))

    case 'SET_CANVAS_SCALE':
      return updateActiveView(state, v => ({ ...v, canvasScale: Math.max(0.25, Math.min(2, action.scale)) }))

    case 'ADD_MODEL':
      return updateActiveView(state, v => ({
        ...v,
        schema: { ...v.schema, models: [...v.schema.models, action.model] },
      }))

    case 'UPDATE_MODEL':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) =>
            m.id === action.modelId ? { ...m, ...action.updates } : m
          ),
        },
      }))

    case 'DELETE_MODEL':
      return {
        ...updateActiveView(state, v => ({
          ...v,
          schema: {
            ...v.schema,
            models: v.schema.models.filter((m) => m.id !== action.modelId),
            relationships: v.schema.relationships.filter(
              (r) => r.fromModelId !== action.modelId && r.toModelId !== action.modelId
            ),
          },
        })),
        selection: null,
      }

    case 'MOVE_MODEL':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) =>
            m.id === action.modelId ? { ...m, position: action.position } : m
          ),
        },
      }))

    case 'TOGGLE_MODEL_COLLAPSE':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) =>
            m.id === action.modelId ? { ...m, collapsed: !m.collapsed } : m
          ),
        },
      }))

    case 'ADD_FIELD':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) =>
            m.id === action.modelId ? { ...m, fields: [...m.fields, action.field] } : m
          ),
        },
      }))

    case 'UPDATE_FIELD':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) =>
            m.id === action.modelId
              ? {
                  ...m,
                  fields: m.fields.map((f) =>
                    f.id === action.fieldId ? { ...f, ...action.updates } : f
                  ),
                }
              : m
          ),
        },
      }))

    case 'DELETE_FIELD':
      return {
        ...updateActiveView(state, v => ({
          ...v,
          schema: {
            ...v.schema,
            models: v.schema.models.map((m) =>
              m.id === action.modelId
                ? { ...m, fields: m.fields.filter((f) => f.id !== action.fieldId) }
                : m
            ),
            relationships: v.schema.relationships.filter(
              (r) =>
                !(
                  (r.fromModelId === action.modelId && r.fromFieldId === action.fieldId) ||
                  (r.toModelId === action.modelId && r.toFieldId === action.fieldId)
                )
            ),
          },
        })),
        selection: null,
      }

    case 'MOVE_FIELD': {
      const { fromModelId, toModelId, fieldId, newIndex } = action
      const activeView = getActiveView(state)
      const fromModel = activeView.schema.models.find((m) => m.id === fromModelId)
      const field = fromModel?.fields.find((f) => f.id === fieldId)

      if (!fromModel || !field) return state

      if (fromModelId === toModelId) {
        const newFields = fromModel.fields.filter((f) => f.id !== fieldId)
        newFields.splice(newIndex, 0, field)
        return updateActiveView(state, v => ({
          ...v,
          schema: {
            ...v.schema,
            models: v.schema.models.map((m) =>
              m.id === fromModelId ? { ...m, fields: newFields } : m
            ),
          },
        }))
      }

      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) => {
            if (m.id === fromModelId) {
              return { ...m, fields: m.fields.filter((f) => f.id !== fieldId) }
            }
            if (m.id === toModelId) {
              const newFields = [...m.fields]
              newFields.splice(newIndex, 0, field)
              return { ...m, fields: newFields }
            }
            return m
          }),
          relationships: v.schema.relationships.map((r) => {
            if (r.fromModelId === fromModelId && r.fromFieldId === fieldId) {
              return { ...r, fromModelId: toModelId }
            }
            if (r.toModelId === fromModelId && r.toFieldId === fieldId) {
              return { ...r, toModelId: toModelId }
            }
            return r
          }),
        },
      }))
    }

    case 'REORDER_FIELDS': {
      const { modelId, fieldIds } = action
      const activeView = getActiveView(state)
      const model = activeView.schema.models.find((m) => m.id === modelId)
      if (!model) return state

      const fieldMap = new Map(model.fields.map((f) => [f.id, f]))
      const newFields = fieldIds.map((id) => fieldMap.get(id)).filter(Boolean) as Field[]

      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: v.schema.models.map((m) =>
            m.id === modelId ? { ...m, fields: newFields } : m
          ),
        },
      }))
    }

    case 'ADD_RELATIONSHIP':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          relationships: [...v.schema.relationships, action.relationship],
        },
      }))

    case 'UPDATE_RELATIONSHIP':
      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          relationships: v.schema.relationships.map((r) =>
            r.id === action.relationshipId ? { ...r, ...action.updates } : r
          ),
        },
      }))

    case 'DELETE_RELATIONSHIP':
      return {
        ...updateActiveView(state, v => ({
          ...v,
          schema: {
            ...v.schema,
            relationships: v.schema.relationships.filter((r) => r.id !== action.relationshipId),
          },
        })),
        selection: null,
      }

    case 'RESET_LAYOUT': {
      const activeView = getActiveView(state)
      const models = activeView.schema.models
      const spacing = 350
      const startX = 100
      const startY = 100

      return updateActiveView(state, v => ({
        ...v,
        schema: {
          ...v.schema,
          models: models.map((m, i) => ({
            ...m,
            position: { x: startX + i * spacing, y: startY },
          })),
        },
        canvasOffset: { x: 0, y: 0 },
        canvasScale: 1,
      }))
    }

    // View actions
    case 'ADD_VIEW':
      return {
        ...state,
        views: [...state.views, action.view],
        activeViewId: action.view.id,
        selection: null,
      }

    case 'DELETE_VIEW': {
      if (state.views.length <= 1) return state
      const newViews = state.views.filter(v => v.id !== action.viewId)
      const needsNewActive = state.activeViewId === action.viewId
      return {
        ...state,
        views: newViews,
        activeViewId: needsNewActive ? newViews[0].id : state.activeViewId,
        selection: null,
      }
    }

    case 'RENAME_VIEW':
      return {
        ...state,
        views: state.views.map(v => v.id === action.viewId ? { ...v, name: action.name } : v),
      }

    case 'SWITCH_VIEW':
      return {
        ...state,
        activeViewId: action.viewId,
        selection: null,
      }

    default:
      return state
  }
}

export interface SchemaContextValue {
  state: SchemaState
  dispatch: React.Dispatch<SchemaAction>
}

export const SchemaContext = createContext<SchemaContextValue | null>(null)

export function useSchema() {
  const context = useContext(SchemaContext)
  if (!context) {
    throw new Error('useSchema must be used within a SchemaProvider')
  }
  return context
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Session persistence helpers
export function saveSession(state: SchemaState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
}

export function loadSession(): SchemaState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as SchemaState
      // Validate structure
      if (parsed.views && Array.isArray(parsed.views) && parsed.views.length > 0 && parsed.activeViewId) {
        return parsed
      }
    }
  } catch (e) {
    console.error('Failed to load session:', e)
  }
  return null
}

export function validateSchema(json: unknown): { valid: boolean; error?: string; schema?: Schema } {
  try {
    if (typeof json !== 'object' || json === null) {
      return { valid: false, error: 'Schema must be an object' }
    }

    const obj = json as Record<string, unknown>

    if (!Array.isArray(obj.models)) {
      return { valid: false, error: 'Schema must have a "models" array' }
    }

    if (!Array.isArray(obj.relationships)) {
      return { valid: false, error: 'Schema must have a "relationships" array' }
    }

    for (const model of obj.models) {
      if (typeof model !== 'object' || model === null) {
        return { valid: false, error: 'Each model must be an object' }
      }
      const m = model as Record<string, unknown>
      if (typeof m.id !== 'string' || typeof m.name !== 'string') {
        return { valid: false, error: 'Each model must have "id" and "name" strings' }
      }
      if (!Array.isArray(m.fields)) {
        return { valid: false, error: `Model "${m.name}" must have a "fields" array` }
      }
      if (typeof m.position !== 'object' || m.position === null) {
        return { valid: false, error: `Model "${m.name}" must have a "position" object` }
      }
      const pos = m.position as Record<string, unknown>
      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        return { valid: false, error: `Model "${m.name}" position must have "x" and "y" numbers` }
      }
    }

    for (const rel of obj.relationships) {
      if (typeof rel !== 'object' || rel === null) {
        return { valid: false, error: 'Each relationship must be an object' }
      }
      const r = rel as Record<string, unknown>
      const requiredFields = ['id', 'fromModelId', 'fromFieldId', 'toModelId', 'toFieldId', 'type']
      for (const field of requiredFields) {
        if (typeof r[field] !== 'string') {
          return { valid: false, error: `Relationship must have "${field}" string` }
        }
      }
    }

    return { valid: true, schema: obj as Schema }
  } catch (e) {
    return { valid: false, error: 'Invalid JSON structure' }
  }
}
