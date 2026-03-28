'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useSchema } from '@/lib/schema-store'
import { ModelCard } from './model-card'
import { RelationshipLines } from './relationship-lines'

export function Canvas() {
  const { state, dispatch } = useSchema()
  const canvasRef = useRef<HTMLDivElement>(null)
  const backgroundRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = -e.deltaY * 0.001
        dispatch({
          type: 'SET_CANVAS_SCALE',
          scale: state.canvasScale + delta,
        })
      } else {
        // Pan via scroll
        dispatch({
          type: 'SET_CANVAS_OFFSET',
          offset: {
            x: state.canvasOffset.x - e.deltaX / state.canvasScale,
            y: state.canvasOffset.y - e.deltaY / state.canvasScale,
          },
        })
      }
    },
    [dispatch, state.canvasScale, state.canvasOffset]
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning) return

      const dx = (e.clientX - panStart.x) / state.canvasScale
      const dy = (e.clientY - panStart.y) / state.canvasScale

      dispatch({
        type: 'SET_CANVAS_OFFSET',
        offset: {
          x: state.canvasOffset.x + dx,
          y: state.canvasOffset.y + dy,
        },
      })

      setPanStart({ x: e.clientX, y: e.clientY })
    },
    [isPanning, panStart, state.canvasScale, state.canvasOffset, dispatch]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleWheel, handleMouseMove, handleMouseUp])

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
          backgroundSize: `${20 * state.canvasScale}px ${20 * state.canvasScale}px`,
          backgroundPosition: `${state.canvasOffset.x * state.canvasScale}px ${state.canvasOffset.y * state.canvasScale}px`,
        }}
        onMouseDown={handleBackgroundMouseDown}
      />

      {/* Canvas content container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${state.canvasOffset.x * state.canvasScale}px, ${state.canvasOffset.y * state.canvasScale}px)`,
        }}
      >
        {/* SVG layer for relationship lines */}
        <svg
          className="absolute inset-0 w-full h-full overflow-visible"
          style={{
            transform: `scale(${state.canvasScale})`,
            transformOrigin: 'top left',
          }}
        >
          <RelationshipLines />
        </svg>

        {/* Model cards layer */}
        <div className="pointer-events-auto">
          {state.schema.models.map((model) => (
            <ModelCard key={model.id} model={model} scale={state.canvasScale} />
          ))}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 rounded bg-secondary px-2 py-1 text-xs text-muted-foreground pointer-events-none">
        {Math.round(state.canvasScale * 100)}%
      </div>
    </div>
  )
}
