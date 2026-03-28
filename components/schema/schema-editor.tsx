'use client'

import { useReducer, useState, useEffect } from 'react'
import { SchemaContext, schemaReducer, initialState } from '@/lib/schema-store'
import { Toolbar } from './toolbar'
import { ModelSidebar } from './model-sidebar'
import { Canvas } from './canvas'
import { InspectorPanel } from './inspector-panel'
import { AddRelationshipDialog } from './add-relationship-dialog'

export function SchemaEditor() {
  const [state, dispatch] = useReducer(schemaReducer, initialState)
  const [addRelOpen, setAddRelOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="h-14 border-b bg-card" />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r bg-sidebar" />
          <div className="flex-1 bg-background" />
          <div className="w-80 border-l bg-card" />
        </div>
      </div>
    )
  }

  return (
    <SchemaContext.Provider value={{ state, dispatch }}>
      <div className="flex flex-col h-screen bg-background">
        <Toolbar onAddRelationship={() => setAddRelOpen(true)} />
        
        <div className="flex flex-1 overflow-hidden">
          <ModelSidebar />
          <Canvas />
          <InspectorPanel />
        </div>

        <AddRelationshipDialog open={addRelOpen} onOpenChange={setAddRelOpen} />
      </div>
    </SchemaContext.Provider>
  )
}
