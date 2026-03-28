'use client'

import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSchema } from '@/lib/schema-store'
import { compressToEncodedURIComponent } from 'lz-string'
import type { SchemaView } from '@/lib/schema-types'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_SAFE_URL_LENGTH = 2000
const MAX_URL_LENGTH = 8000

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { state } = useSchema()
  const [selectedViewIds, setSelectedViewIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  // Select all views by default when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedViewIds(new Set(state.views.map(v => v.id)))
      setCopied(false)
    }
  }, [open, state.views])

  const toggleView = (viewId: string) => {
    setSelectedViewIds(prev => {
      const next = new Set(prev)
      if (next.has(viewId)) {
        next.delete(viewId)
      } else {
        next.add(viewId)
      }
      return next
    })
  }

  const shareData = useMemo(() => {
    const selectedViews = state.views
      .filter(v => selectedViewIds.has(v.id))
      .map(v => ({
        name: v.name,
        schema: v.schema,
      }))
    
    if (selectedViews.length === 0) {
      return { url: '', length: 0, isValid: false }
    }

    const json = JSON.stringify(selectedViews)
    const compressed = compressToEncodedURIComponent(json)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}?share=${compressed}`

    return {
      url,
      length: url.length,
      isValid: url.length <= MAX_URL_LENGTH,
      isWarning: url.length > MAX_SAFE_URL_LENGTH,
    }
  }, [state.views, selectedViewIds])

  const handleCopy = async () => {
    if (shareData.url) {
      await navigator.clipboard.writeText(shareData.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyJson = async () => {
    const selectedViews = state.views
      .filter(v => selectedViewIds.has(v.id))
      .map(v => ({
        name: v.name,
        schema: v.schema,
      }))
    await navigator.clipboard.writeText(JSON.stringify(selectedViews, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Schema</DialogTitle>
          <DialogDescription>
            Generate a shareable link that includes your selected views. Anyone with the link can import these schemas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select views to share</Label>
            <div className="space-y-2 rounded-md border p-3">
              {state.views.map(view => (
                <div key={view.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`share-view-${view.id}`}
                    checked={selectedViewIds.has(view.id)}
                    onCheckedChange={() => toggleView(view.id)}
                  />
                  <Label 
                    htmlFor={`share-view-${view.id}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {view.name}
                    <span className="text-muted-foreground ml-2">
                      ({view.schema.models.length} models)
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {selectedViewIds.size > 0 && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Share link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareData.url}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    disabled={!shareData.isValid}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL length: {shareData.length.toLocaleString()} characters
                </p>
              </div>

              {shareData.isWarning && shareData.isValid && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-500/50 bg-yellow-500/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    This URL is long and may not work in all browsers or when shared via some apps. Consider sharing fewer views or using the JSON export for very large schemas.
                  </p>
                </div>
              )}

              {!shareData.isValid && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="text-xs text-destructive">
                      The selected schemas are too large to share via URL. Please select fewer views or use JSON export instead.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleCopyJson}>
                      Copy as JSON
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {shareData.isValid && selectedViewIds.size > 0 && (
            <Button onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
