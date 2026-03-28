'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useSchema, getActiveView } from '@/lib/schema-store'
import { ModelCard } from './model-card'
import { RelationshipLines } from './relationship-lines'

const MIN_SCALE = 0.25
const MAX_SCALE = 2

export function Canvas() {
  const { state, dispatch } = useSchema()
  const activeView = getActiveView(state)
  const canvasRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null)

  const clampScale = useCallback((scale: number) => {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
  }, [])

  const zoomAtPoint = useCallback(
    (nextScale: number, pointX: number, pointY: number) => {
      const currentScale = activeView.canvasScale
      const clampedScale = clampScale(nextScale)
      if (clampedScale === currentScale) return

      const nextOffsetX =
        activeView.canvasOffset.x + pointX * (1 / clampedScale - 1 / currentScale)
      const nextOffsetY =
        activeView.canvasOffset.y + pointY * (1 / clampedScale - 1 / currentScale)

      dispatch({
        type: 'SET_CANVAS_OFFSET',
        offset: {
          x: nextOffsetX,
          y: nextOffsetY,
        },
      })
      dispatch({
        type: 'SET_CANVAS_SCALE',
        scale: clampedScale,
      })
    },
    [activeView.canvasScale, activeView.canvasOffset, clampScale, dispatch]
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
        zoomAtPoint(activeView.canvasScale + delta, pointX, pointY)
      } else {
        // Pan via scroll
        dispatch({
          type: 'SET_CANVAS_OFFSET',
          offset: {
            x: activeView.canvasOffset.x - e.deltaX / activeView.canvasScale,
            y: activeView.canvasOffset.y - e.deltaY / activeView.canvasScale,
          },
        })
      }
    },
    [dispatch, activeView.canvasScale, activeView.canvasOffset]
  )

  const handleBackgroundMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Left click on background or middle click anywhere starts panning
      if (e.button === 0 || e.button === 1) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
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
        setIsPanning(true)
        setPanStart({ x: touch.clientX, y: touch.clientY })
        dispatch({ type: 'SET_SELECTION', selection: null })
      } else if (e.touches.length === 2) {
        // Two fingers - prepare for pinch zoom
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        setLastPinchDistance(distance)
      }
    },
    [dispatch]
  )

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanning) return

      const dx = (clientX - panStart.x) / activeView.canvasScale
      const dy = (clientY - panStart.y) / activeView.canvasScale

      dispatch({
        type: 'SET_CANVAS_OFFSET',
        offset: {
          x: activeView.canvasOffset.x + dx,
          y: activeView.canvasOffset.y + dy,
        },
      })

      setPanStart({ x: clientX, y: clientY })
    },
    [isPanning, panStart, activeView.canvasScale, activeView.canvasOffset, dispatch]
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
      if (e.touches.length === 1 && isPanning) {
        e.preventDefault()
        const touch = e.touches[0]
        handlePointerMove(touch.clientX, touch.clientY)
      } else if (e.touches.length === 2 && lastPinchDistance !== null) {
        e.preventDefault()

        const canvasRect = canvasRef.current?.getBoundingClientRect()
        if (!canvasRect) return

        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const delta = (distance - lastPinchDistance) * 0.005
        const pointX = centerX - canvasRect.left
        const pointY = centerY - canvasRect.top

        zoomAtPoint(activeView.canvasScale + delta, pointX, pointY)
        setLastPinchDistance(distance)
      }
    },
    [isPanning, lastPinchDistance, handlePointerMove, zoomAtPoint, activeView.canvasScale]
  )

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
    setLastPinchDistance(null)
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
          backgroundSize: `${20 * activeView.canvasScale}px ${20 * activeView.canvasScale}px`,
          backgroundPosition: `${activeView.canvasOffset.x * activeView.canvasScale}px ${activeView.canvasOffset.y * activeView.canvasScale}px`,
          touchAction: 'none',
        }}
        onMouseDown={handleBackgroundMouseDown}
        onTouchStart={handleBackgroundTouchStart}
      />

      {/* Canvas content container - single transform for both lines and cards */}
      <div
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
          <RelationshipLines />
        </svg>

        {/* Model cards layer */}
        <div className="pointer-events-auto">
          {activeView.schema.models.map((model) => (
            <ModelCard key={model.id} model={model} />
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
