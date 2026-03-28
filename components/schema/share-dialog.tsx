'use client'

import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useSchema, getActiveView } from '@/lib/schema-store'
import { compressToEncodedURIComponent } from 'lz-string'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_SAFE_URL_LENGTH = 2000
const MAX_URL_LENGTH = 8000

export function ShareDialog({ open, onOpenChange }: ShareDialogProps) {
  const { state } = useSchema()
  const activeView = getActiveView(state)
  const [selectedViewIds, setSelectedViewIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<string>('link')

  // Select all views by default when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedViewIds(new Set(state.views.map(v => v.id)))
      setCopied(false)
      setTab('link')
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
      return { url: '', length: 0, isValid: false, json: '[]' }
    }

    const json = JSON.stringify(selectedViews, null, 2)
    const compressed = compressToEncodedURIComponent(JSON.stringify(selectedViews))
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}?share=${compressed}`

    return {
      url,
      length: url.length,
      isValid: url.length <= MAX_URL_LENGTH,
      isWarning: url.length > MAX_SAFE_URL_LENGTH,
      json,
    }
  }, [state.views, selectedViewIds])

  const handleCopyLink = async () => {
    if (shareData.url) {
      await navigator.clipboard.writeText(shareData.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(shareData.json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([shareData.json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = selectedViewIds.size === 1 
      ? `${state.views.find(v => selectedViewIds.has(v.id))?.name || 'schema'}.json`
      : 'schemas.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadCurrentView = () => {
    const json = JSON.stringify(activeView.schema, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeView.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share & Export</DialogTitle>
          <DialogDescription>
            Share your schemas via link or export as JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="export">Export JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select views to share</Label>
              <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
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
                      onClick={handleCopyLink}
                      disabled={!shareData.isValid}
                    >
                      {copied && tab === 'link' ? (
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
                      This URL is long and may not work in all browsers. Consider using JSON export instead.
                    </p>
                  </div>
                )}

                {!shareData.isValid && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-destructive">
                      The selected schemas are too large for URL sharing. Use JSON export instead.
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Current View</p>
                  <p className="text-xs text-muted-foreground">
                    Export &quot;{activeView.name}&quot; ({activeView.schema.models.length} models)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadCurrentView}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              </div>

              <div className="border-t pt-3">
                <Label className="text-sm font-medium">Or export selected views</Label>
                <div className="space-y-2 rounded-md border p-3 mt-2 max-h-32 overflow-y-auto">
                  {state.views.map(view => (
                    <div key={view.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`export-view-${view.id}`}
                        checked={selectedViewIds.has(view.id)}
                        onCheckedChange={() => toggleView(view.id)}
                      />
                      <Label 
                        htmlFor={`export-view-${view.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {view.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedViewIds.size > 0 && (
                <div className="space-y-2">
                  <Textarea
                    value={shareData.json}
                    readOnly
                    className="h-40 font-mono text-xs"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleCopyJson}>
                      {copied && tab === 'export' ? (
                        <>
                          <Check className="h-4 w-4 mr-1.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy JSON
                        </>
                      )}
                    </Button>
                    <Button className="flex-1" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
