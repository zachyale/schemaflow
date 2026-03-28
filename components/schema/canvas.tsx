'use client'

import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useSchema, getActiveView } from '@/lib/schema-store'
import { ModelCard } from './model-card'
import { RelationshipLines } from './relationship-lines'

const MIN_SCALE = 0.25
const MAX_SCALE = 2

interface CanvasProps {
  onModelDragStateChange?: (isDragging: boolean) => void
}

export function Canvas({ onModelDragStateChange }: CanvasProps) {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const canvasRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(activeView.canvasScale)
  const offsetRef = useRef(activeView.canvasOffset)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const lastPinchDistanceRef = useRef<number | null>(null)
  const commitTimerRef = useRef<number | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })

  const clampScale = useCallback((scale: number) => {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
  }, [])

  useEffect(() => {
    scaleRef.current = activeView.canvasScale
    offsetRef.current = activeView.canvasOffset
    if (contentRef.current) {
      contentRef.current.style.transform = `scale(${activeView.canvasScale}) translate(${activeView.canvasOffset.x}px, ${activeView.canvasOffset.y}px)`
    }
    if (backgroundRef.current) {
      backgroundRef.current.style.backgroundPosition = `${activeView.canvasOffset.x * activeView.canvasScale}px ${activeView.canvasOffset.y * activeView.canvasScale}px`
    }
  }, [activeView.canvasScale, activeView.canvasOffset])

  const applyViewToDom = useCallback((offset: { x: number; y: number }, scale: number) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`
    }
    if (backgroundRef.current) {
      backgroundRef.current.style.backgroundPosition = `${offset.x * scale}px ${offset.y * scale}px`
    }
  }, [])

  const commitView = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
    dispatch({
      type: 'SET_CANVAS_VIEW',
      offset: offsetRef.current,
      scale: scaleRef.current,
    })
  }, [dispatch])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      setViewportSize({ width: canvas.clientWidth, height: canvas.clientHeight })
    }
    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  const scheduleCanvasView = useCallback(
    (nextOffset: { x: number; y: number }, nextScale: number, immediateCommit = false) => {
      offsetRef.current = nextOffset
      scaleRef.current = clampScale(nextScale)
      applyViewToDom(offsetRef.current, scaleRef.current)

      if (immediateCommit) {
        commitView()
        return
      }

      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current)
      }
      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null
        dispatch({
          type: 'SET_CANVAS_VIEW',
          offset: offsetRef.current,
          scale: scaleRef.current,
        })
      }, 80)
    },
    [applyViewToDom, clampScale, commitView, dispatch]
  )

  const zoomAtPoint = useCallback(
    (nextScale: number, pointX: number, pointY: number) => {
      const currentScale = scaleRef.current
      const clampedScale = clampScale(nextScale)
      if (clampedScale === currentScale) return

      const currentOffset = offsetRef.current
      const nextOffsetX =
        currentOffset.x + pointX * (1 / clampedScale - 1 / currentScale)
      const nextOffsetY =
        currentOffset.y + pointY * (1 / clampedScale - 1 / currentScale)

      scheduleCanvasView({ x: nextOffsetX, y: nextOffsetY }, clampedScale)
    },
    [clampScale, scheduleCanvasView]
  )

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      if (e.ctrlKey || e.metaKey) {
        // Zoom around cursor position so focal point stays fixed.
        const canvasRect = canvasRef.current?.getBoundingClientRect()
        if (!canvasRect) return

        const pointX = e.clientX - canvasRect.left
        const pointY = e.clientY - canvasRect.top
        const delta = -e.deltaY * 0.001
        zoomAtPoint(scaleRef.current + delta, pointX, pointY)
      } else {
        // Pan via scroll
        const scale = scaleRef.current
        const currentOffset = offsetRef.current
        scheduleCanvasView(
          {
            x: currentOffset.x - e.deltaX / scale,
            y: currentOffset.y - e.deltaY / scale,
          },
          scale
        )
      }
    },
    [zoomAtPoint, scheduleCanvasView]
  )

  const handleBackgroundMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Left click on background or middle click anywhere starts panning
      if (e.button === 0 || e.button === 1) {
        e.preventDefault()
        isPanningRef.current = true
        setIsPanning(true)
        panStartRef.current = { x: e.clientX, y: e.clientY }
        dispatch({ type: 'SET_SELECTION', selection: null })
      }
    },
    [dispatch]
  )

  // Touch handlers for iPad/mobile
  const handleBackgroundTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single finger - pan
        const touch = e.touches[0]
        isPanningRef.current = true
        setIsPanning(true)
        panStartRef.current = { x: touch.clientX, y: touch.clientY }
        dispatch({ type: 'SET_SELECTION', selection: null })
      } else if (e.touches.length === 2) {
        // Two fingers - prepare for pinch zoom
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        lastPinchDistanceRef.current = distance
      }
    },
    [dispatch]
  )

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanningRef.current) return

      const scale = scaleRef.current
      const currentPanStart = panStartRef.current
      const currentOffset = offsetRef.current
      const dx = (clientX - currentPanStart.x) / scale
      const dy = (clientY - currentPanStart.y) / scale

      scheduleCanvasView(
        {
          x: currentOffset.x + dx,
          y: currentOffset.y + dy,
        },
        scale
      )

      panStartRef.current = { x: clientX, y: clientY }
    },
    [scheduleCanvasView]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY)
    },
    [handlePointerMove]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      // Only handle canvas panning if we started panning on the background
      // Model card touch events will handle themselves
      if (e.touches.length === 1 && isPanningRef.current) {
        e.preventDefault()
        const touch = e.touches[0]
        handlePointerMove(touch.clientX, touch.clientY)
      } else if (e.touches.length === 2 && lastPinchDistanceRef.current !== null) {
        e.preventDefault()

        const canvasRect = canvasRef.current?.getBoundingClientRect()
        if (!canvasRect) return

        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const delta = (distance - lastPinchDistanceRef.current) * 0.005
        const pointX = centerX - canvasRect.left
        const pointY = centerY - canvasRect.top

        zoomAtPoint(scaleRef.current + delta, pointX, pointY)
        lastPinchDistanceRef.current = distance
      }
    },
    [handlePointerMove, zoomAtPoint]
  )

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false
    setIsPanning(false)
    lastPinchDistanceRef.current = null
    commitView()
  }, [commitView])

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchend', handlePointerUp)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      canvas.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [handleWheel, handleTouchMove, handleMouseMove, handlePointerUp])

  const viewBounds = useMemo(() => {
    const scale = activeView.canvasScale
    if (scale <= 0 || viewportSize.width === 0 || viewportSize.height === 0) {
      return null
    }
    const margin = 600
    return {
      left: -activeView.canvasOffset.x - margin / scale,
      top: -activeView.canvasOffset.y - margin / scale,
      right: -activeView.canvasOffset.x + viewportSize.width / scale + margin / scale,
      bottom: -activeView.canvasOffset.y + viewportSize.height / scale + margin / scale,
    }
  }, [activeView.canvasOffset, activeView.canvasScale, viewportSize.width, viewportSize.height])

  const visibleModels = useMemo(() => {
    if (!viewBounds) return activeView.schema.models
    return activeView.schema.models.filter((model) => {
      const width = 240
      const height = model.collapsed ? 44 : 44 + model.fields.length * 32 + 8
      return (
        model.position.x < viewBounds.right &&
        model.position.x + width > viewBounds.left &&
        model.position.y < viewBounds.bottom &&
        model.position.y + height > viewBounds.top
      )
    })
  }, [activeView.schema.models, viewBounds])

  const visibleModelIds = useMemo(() => {
    return new Set(visibleModels.map((model) => model.id))
  }, [visibleModels])

  return (
    <div
      ref={canvasRef}
      data-canvas
      className="relative flex-1 overflow-hidden bg-background"
      style={{
        cursor: isPanning ? 'grabbing' : 'default',
      }}
    >
      {/* Background layer for panning - this is the clickable area */}
      <div
        ref={backgroundRef}
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`,
          backgroundSize: `20px 20px`,
          backgroundPosition: `${activeView.canvasOffset.x * activeView.canvasScale}px ${activeView.canvasOffset.y * activeView.canvasScale}px`,
          touchAction: 'none',
        }}
        onMouseDown={handleBackgroundMouseDown}
        onTouchStart={handleBackgroundTouchStart}
      />

      {/* Canvas content container - single transform for both lines and cards */}
      <div
        ref={contentRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `scale(${activeView.canvasScale}) translate(${activeView.canvasOffset.x}px, ${activeView.canvasOffset.y}px)`,
          transformOrigin: 'top left',
        }}
      >
        {/* SVG layer for relationship lines */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
        >
          <RelationshipLines visibleModelIds={visibleModelIds} />
        </svg>

        {/* Model cards layer */}
        <div className="pointer-events-auto">
          {visibleModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onDragStateChange={onModelDragStateChange}
            />
          ))}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 rounded bg-secondary px-2 py-1 text-xs text-muted-foreground pointer-events-none">
        {Math.round(activeView.canvasScale * 100)}%
      </div>
    </div>
  )
}
