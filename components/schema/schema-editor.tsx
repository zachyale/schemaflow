'use client'

import { useReducer, useState } from 'react'
import { SchemaContext, schemaReducer, initialState } from '@/lib/schema-store'
import { Toolbar } from './toolbar'
import { ModelSidebar } from './model-sidebar'
import { Canvas } from './canvas'
import { InspectorPanel } from './inspector-panel'
import { AddRelationshipDialog } from './add-relationship-dialog'

export function SchemaEditor() {
  const [state, dispatch] = useReducer(schemaReducer, initialState)
  const [addRelOpen, setAddRelOpen] = useState(false)

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
