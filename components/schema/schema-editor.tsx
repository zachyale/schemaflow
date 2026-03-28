'use client'

import { useReducer, useState, useEffect } from 'react'
import { SchemaContext, schemaReducer, initialState, saveSession, loadSession, getActiveView } from '@/lib/schema-store'
import { Toolbar } from './toolbar'
import { ModelSidebar } from './model-sidebar'
import { Canvas } from './canvas'
import { InspectorPanel } from './inspector-panel'
import { AddRelationshipDialog } from './add-relationship-dialog'
import { ViewTabs } from './view-tabs'

export function SchemaEditor() {
  const [state, dispatch] = useReducer(schemaReducer, initialState)
  const [addRelOpen, setAddRelOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Load session on mount
  useEffect(() => {
    const savedState = loadSession()
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', state: savedState })
    }
    setMounted(true)
  }, [])

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
      </div>
    </SchemaContext.Provider>
  )
}
