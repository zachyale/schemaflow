'use client'

import { Database, Table, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchema, getActiveView } from '@/lib/schema-store'
import { Button } from '@/components/ui/button'

interface ModelSidebarProps {
  className?: string
  onModelSelect?: () => void
  onRequestClose?: () => void
}

export function ModelSidebar({ className, onModelSelect, onRequestClose }: ModelSidebarProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)

  const handleModelClick = (modelId: string) => {
    dispatch({ type: 'SET_SELECTION', selection: { type: 'model', modelId } })

    // Center view on model
    const model = activeView.schema.models.find((m) => m.id === modelId)
    if (model) {
      dispatch({
        type: 'SET_CANVAS_OFFSET',
        offset: {
          x: -model.position.x + 200,
          y: -model.position.y + 100,
        },
      })
    }

    onModelSelect?.()
  }

  return (
    <div className={cn('w-56 border-r bg-sidebar flex flex-col', className)}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Database className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-sidebar-foreground">Models</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {activeView.schema.models.length}
        </span>
        {onRequestClose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-1"
            onClick={onRequestClose}
            aria-label="Close models sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {activeView.schema.models.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No models yet. Click &quot;Add Model&quot; to create one.
            </p>
          ) : (
            activeView.schema.models.map((model) => {
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
      </div>

      {/* Relationships summary */}
      <div className="border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {activeView.schema.relationships.length} relationship
          {activeView.schema.relationships.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
