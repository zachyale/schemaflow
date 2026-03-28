'use client'

import { useReducer, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SchemaContext, schemaReducer, initialState, saveSession, loadSession, generateId } from '@/lib/schema-store'
import { decompressFromEncodedURIComponent } from 'lz-string'
import type { Schema, SchemaView } from '@/lib/schema-types'
import { Toolbar } from './toolbar'
import { ModelSidebar } from './model-sidebar'
import { Canvas } from './canvas'
import { InspectorPanel } from './inspector-panel'
import { AddRelationshipDialog } from './add-relationship-dialog'
import { ShareDialog } from './share-dialog'
import { ViewTabs } from './view-tabs'

export function SchemaEditor() {
  const [state, dispatch] = useReducer(schemaReducer, initialState)
  const [addRelOpen, setAddRelOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Load session on mount and handle shared URL import from lz-string compressed data
  useEffect(() => {
    // First load saved session
    const savedState = loadSession()
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', state: savedState })
    }
    
    // Then check for shared data in URL
    const shareParam = searchParams.get('share')
    if (shareParam) {
      try {
        const decompressed = decompressFromEncodedURIComponent(shareParam)
        if (decompressed) {
          const sharedViews = JSON.parse(decompressed) as Array<{ name: string; schema: Schema }>
          
          // Import each shared view
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
