'use client'

import { Database, Table } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchema } from '@/lib/schema-store'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ModelSidebar() {
  const { state, dispatch } = useSchema()

  const handleModelClick = (modelId: string) => {
    dispatch({ type: 'SET_SELECTION', selection: { type: 'model', modelId } })

    // Center view on model
    const model = state.schema.models.find((m) => m.id === modelId)
    if (model) {
      dispatch({
        type: 'SET_CANVAS_OFFSET',
        offset: {
          x: -model.position.x + 200,
          y: -model.position.y + 100,
        },
      })
    }
  }

  return (
    <div className="w-56 border-r bg-sidebar flex flex-col">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-sidebar-foreground">Models</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {state.schema.models.length}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {state.schema.models.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No models yet. Click &quot;Add Model&quot; to create one.
            </p>
          ) : (
            state.schema.models.map((model) => {
              const isSelected =
                state.selection?.type === 'model' && state.selection.modelId === model.id

              return (
                <button
                  key={model.id}
                  onClick={() => handleModelClick(model.id)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Table className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{model.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {model.fields.length} fields
                  </span>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Relationships summary */}
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {state.schema.relationships.length} relationship
          {state.schema.relationships.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
