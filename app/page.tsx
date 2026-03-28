import { Suspense } from 'react'
import { SchemaEditor } from '@/components/schema/schema-editor'

function SchemaEditorFallback() {
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

export default function Home() {
  return (
    <Suspense fallback={<SchemaEditorFallback />}>
      <SchemaEditor />
    </Suspense>
  )
}
