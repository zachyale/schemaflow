'use client'

import { useReducer, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SchemaContext, schemaReducer, initialState, saveSession, loadSession, generateId } from '@/lib/schema-store'
import { decompressFromUrl } from '@/lib/compression'
import type { Schema, SchemaView, Model, Field, Relationship } from '@/lib/schema-types'
import { Toolbar } from './toolbar'
import { ModelSidebar } from './model-sidebar'
import { Canvas } from './canvas'
import { InspectorPanel } from './inspector-panel'
import { AddRelationshipDialog } from './add-relationship-dialog'
import { ShareDialog } from './share-dialog'
import { ViewTabs } from './view-tabs'

// Compact format types (matching share-dialog)
interface CompactField {
  n: string; t: string; p?: 1; f?: 1; u?: 1; x?: 1; d?: string
}
interface CompactModel {
  n: string; f: CompactField[]
}
interface CompactRelationship {
  n: string; fm: number; ff: number; tm: number; tf: number; t: string
}
interface CompactView {
  n: string; m: CompactModel[]; r: CompactRelationship[]
}

// Check if data is in compact format
function isCompactFormat(data: unknown): data is CompactView[] {
  return Array.isArray(data) && data.length > 0 && 'm' in data[0] && 'r' in data[0]
}

// Convert compact format back to full schema with auto-layout
function fromCompactView(compact: CompactView): { name: string; schema: Schema } {
  const models: Model[] = compact.m.map((cm, mi) => {
    const fields: Field[] = cm.f.map((cf) => ({
      id: generateId('field'),
      name: cf.n,
      type: cf.t,
      primaryKey: cf.p === 1,
      foreignKey: cf.f === 1,
      unique: cf.u === 1,
      nullable: cf.x === 1,
      default: cf.d,
    }))
    
    // Auto-layout: arrange in grid
    const cols = 3
    const col = mi % cols
    const row = Math.floor(mi / cols)
    
    return {
      id: generateId('model'),
      name: cm.n,
      position: { x: 100 + col * 350, y: 100 + row * 300 },
      fields,
    }
  })

  // Build field ID lookup for relationships
  const fieldIdLookup: string[][] = models.map(m => m.fields.map(f => f.id))

  const relationships: Relationship[] = compact.r.map(cr => ({
    id: generateId('rel'),
    name: cr.n,
    fromModelId: models[cr.fm]?.id ?? '',
    fromFieldId: fieldIdLookup[cr.fm]?.[cr.ff] ?? '',
    toModelId: models[cr.tm]?.id ?? '',
    toFieldId: fieldIdLookup[cr.tm]?.[cr.tf] ?? '',
    type: cr.t as Relationship['type'],
  }))

  return {
    name: compact.n,
    schema: { models, relationships },
  }
}

export function SchemaEditor() {
  const [state, dispatch] = useReducer(schemaReducer, initialState)
  const [addRelOpen, setAddRelOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Load session on mount and handle shared URL import via compression utility
  useEffect(() => {
    // First load saved session
    const savedState = loadSession()
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', state: savedState })
    }
    
    // Check for shared data in URL (supports both old 'share' and new compact 's' params)
    const shareParam = searchParams.get('s') || searchParams.get('share')
    if (shareParam) {
      try {
        const decompressed = decompressFromUrl(shareParam)
        if (decompressed) {
          const parsed = JSON.parse(decompressed)
          
          // Handle both compact format and legacy full format
          if (isCompactFormat(parsed)) {
            // New compact format
            parsed.forEach((compactView) => {
              const { name, schema } = fromCompactView(compactView)
              const newView: SchemaView = {
                id: generateId('view'),
                name,
                schema,
                canvasOffset: { x: 0, y: 0 },
                canvasScale: 1,
              }
              dispatch({ type: 'ADD_VIEW', view: newView })
            })
          } else {
            // Legacy full format
            const sharedViews = parsed as Array<{ name: string; schema: Schema }>
            sharedViews.forEach((viewData, index) => {
              const newView: SchemaView = {
                id: generateId('view'),
                name: viewData.name || `Imported ${index + 1}`,
                schema: viewData.schema,
                canvasOffset: { x: 0, y: 0 },
                canvasScale: 1,
              }
              dispatch({ type: 'ADD_VIEW', view: newView })
            })
          }
          
          // Clear the share param from URL
          router.replace('/', { scroll: false })
        }
      } catch (e) {
        console.error('Failed to import shared schema:', e)
      }
    }
    
    setMounted(true)
  }, [searchParams, router])

  // Save session on state changes (debounced)
  useEffect(() => {
    if (!mounted) return
    
    const timeout = setTimeout(() => {
      saveSession(state)
    }, 500)
    
    return () => clearTimeout(timeout)
  }, [state, mounted])

  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="h-12 border-b bg-card" />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r bg-sidebar" />
          <div className="flex-1 bg-background" />
        </div>
      </div>
    )
  }

  return (
    <SchemaContext.Provider value={{ state, dispatch }}>
      <div className="flex flex-col h-screen bg-background">
        <Toolbar 
          onAddRelationship={() => setAddRelOpen(true)}
          onShare={() => setShareOpen(true)}
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen(!inspectorOpen)}
        />
        
        <ViewTabs />
        
        <div className="flex flex-1 overflow-hidden">
          <ModelSidebar />
          <Canvas />
          {inspectorOpen && <InspectorPanel />}
        </div>

        <AddRelationshipDialog open={addRelOpen} onOpenChange={setAddRelOpen} />
        <ShareDialog open={shareOpen} onOpenChange={setShareOpen} />
      </div>
    </SchemaContext.Provider>
  )
}
