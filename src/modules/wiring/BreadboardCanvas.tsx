// src/modules/wiring/BreadboardCanvas.tsx
// SVG breadboard visualization with pan (drag) and zoom (wheel)
import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useAppStore } from '../../store/app.store'
import { buildBreadboardLayout, type BreadboardLayout, type BreadboardElement } from './breadboard-layout'
import type { AIProjectSchema } from '../../shared/types/project.schema'

const ROW = 24
const COL = 24

const TYPE_COLORS: Record<string, string> = {
  mcu:'#00ff9d', sensor:'#00e5ff', actuator:'#ffd700', display:'#c084fc',
  power:'#ef4444', passive:'#5a7a9a',
}

function wirePath(points: [number,number][]): string {
  if (points.length < 2) return ''
  const [start, ...rest] = points
  let d = `M ${start[0]} ${start[1]}`
  for (let i = 1; i < rest.length - 1; i++) {
    const prev = rest[i - 1], next = rest[i + 1]
    const cpx = (prev[0] + next[0]) / 2
    const cpy = (prev[1] + next[1]) / 2
    d += ` Q ${prev[0]} ${prev[1]} ${cpx} ${cpy}`
  }
  const last = rest[rest.length - 1]
  d += ` L ${last[0]} ${last[1]}`
  return d
}

function renderEl(el: BreadboardElement, idx: number): React.ReactNode {
  const k = el.kind

  if (k === 'chip') {
    const e = el as any
    const typeColor = TYPE_COLORS[e.type] ?? '#00ff9d'
    return (
      <g key={e.id} transform={`translate(${e.x}, ${e.y})`}>
        <rect x={0} y={0} width={e.w} height={e.h}
          fill="#0d1e33" stroke={typeColor} strokeWidth={1.5}
          rx={4} ry={4} opacity={0.9} />
        <rect x={0} y={0} width={e.w} height={6}
          fill={typeColor} opacity={0.7} rx={4} ry={0} />
        <text x={e.w / 2} y={e.h / 2 - 6}
          textAnchor="middle" fill={typeColor}
          fontSize={7} fontFamily='"JetBrains Mono",monospace' fontWeight={700}
          letterSpacing="0.06em">
          {e.label.length > 10 ? e.label.slice(0, 9) + '\u2026' : e.label}
        </text>
        <text x={e.w / 2} y={e.h / 2 + 7}
          textAnchor="middle" fill="#5a7a9a"
          fontSize={5.5} fontFamily='"JetBrains Mono",monospace'>
          {e.model.length > 14 ? e.model.slice(0, 13) + '\u2026' : e.model}
        </text>
        <text x={e.w / 2} y={e.h - 6}
          textAnchor="middle" fill="#3a5a7a"
          fontSize={4.5} fontFamily='"JetBrains Mono",monospace'>
          {e.pinCount} pins
        </text>
        {Array.from({ length: Math.ceil(e.pinCount / 2) }, (_, i) => (
          <React.Fragment key={i}>
            <line x1={-3} y1={20 + i * 12} x2={0} y2={20 + i * 12}
              stroke={typeColor} strokeWidth={1} opacity={0.5} />
            <line x1={e.w} y1={20 + i * 12} x2={e.w + 3} y2={20 + i * 12}
              stroke={typeColor} strokeWidth={1} opacity={0.5} />
          </React.Fragment>
        ))}
      </g>
    )
  }

  if (k === 'pin-dot') {
    const e = el as any
    if (!e.pinName) {
      return (
        <circle key={e.id} cx={e.x} cy={e.y} r={2.5}
          fill="#1e3a5f" stroke="#2a4a6f" strokeWidth={0.5} />
      )
    }
    const isVcc = ['VCC','3V3','5V'].includes(e.pinName.toUpperCase())
    const isGnd = e.pinName.toUpperCase() === 'GND'
    const dotColor = isVcc ? '#ef4444' : isGnd ? '#6b7280' : '#00e5ff'
    return (
      <g key={e.id}>
        <circle cx={e.x} cy={e.y} r={4} fill={dotColor} opacity={0.9} />
        <circle cx={e.x} cy={e.y} r={2} fill="#0d1e33" />
        {e.gpioNum !== undefined && (
          <text x={e.x + 6} y={e.y + 3}
            fill="#3a5a7a" fontSize={4} fontFamily='"JetBrains Mono",monospace'>
            GPIO{e.gpioNum}
          </text>
        )}
      </g>
    )
  }

  if (k === 'wire') {
    const e = el as any
    const d = wirePath(e.points)
    const isPower = e.label && ['VCC','3V3','5V','GND'].includes(e.label.toUpperCase())
    return (
      <g key={e.id}>
        <path d={d} fill="none" stroke={e.color} strokeWidth={e.width ?? 2}
          strokeLinecap="round" strokeLinejoin="round"
          opacity={isPower ? 0.85 : 0.75} />
        {isPower && (
          <path d={d} fill="none" stroke={e.color} strokeWidth={5}
            strokeLinecap="round" opacity={0.15} />
        )}
        {e.label && (
          <text
            x={(e.points[0][0] + e.points[e.points.length - 1][0]) / 2}
            y={(e.points[0][1] + e.points[e.points.length - 1][1]) / 2 - 5}
            textAnchor="middle" fill={e.color} fontSize={5}
            fontFamily='"JetBrains Mono",monospace' opacity={0.8}>
            {e.label}
          </text>
        )}
      </g>
    )
  }

  if (k === 'track-h') {
    const e = el as any
    return (
      <line key={e.id} x1={e.x} y1={e.y} x2={e.x + e.length} y2={e.y}
        stroke={e.color} strokeWidth={2} strokeLinecap="round" />
    )
  }

  return null
}

interface BreadboardCanvasProps {
  schema: AIProjectSchema | null
}

export function BreadboardCanvas({ schema }: BreadboardCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = React.useState<BreadboardLayout | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  // Pan state
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 })
  const registerBBCanvas = useAppStore(s => (s as any).registerBBCanvas)

  useEffect(() => {
    if (!schema) { setLayout(null); return }
    const l = buildBreadboardLayout(schema)
    setLayout(l)
    // Auto-fit on schema change
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth
      const ch = containerRef.current.clientHeight
      const sX = (cw - 40) / l.viewWidth
      const sY = (ch - 40) / l.viewHeight
      const s = Math.min(sX, sY, 1)
      setScale(s)
      setOffset({ x: (cw - l.viewWidth * s) / 2, y: (ch - l.viewHeight * s) / 2 })
    }
  }, [schema])

  useEffect(() => {
    if (!layout || !svgRef.current) return
    registerBBCanvas?.(svgRef.current)
  }, [layout, registerBBCanvas])

  // ── Pan ────────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragStart.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y }
  }, [offset])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    setOffset({
      x: dragStart.current.offX + (e.clientX - dragStart.current.x),
      y: dragStart.current.offY + (e.clientY - dragStart.current.y),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // ── Zoom ───────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.max(0.1, Math.min(4, s * delta)))
  }, [])

  // ── Reset view ───────────────────────────────────────────────────────
  const resetView = useCallback(() => {
    if (!layout || !containerRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const sX = (cw - 40) / layout.viewWidth
    const sY = (ch - 40) / layout.viewHeight
    const s = Math.min(sX, sY, 1)
    setScale(s)
    setOffset({ x: (cw - layout.viewWidth * s) / 2, y: (ch - layout.viewHeight * s) / 2 })
  }, [layout])

  const handleExportPNG = useCallback(async () => {
    if (!svgRef.current || !layout) return
    try {
      const svgEl = svgRef.current
      const svgClone = svgEl.cloneNode(true) as SVGSVGElement
      svgClone.style.transform = ''
      svgClone.style.position = 'absolute'
      svgClone.style.top = '0'
      svgClone.style.left = '0'

      const svgStr = new XMLSerializer().serializeToString(svgClone)
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = url
      })

      const canvas = document.createElement('canvas')
      canvas.width = layout.viewWidth * 2
      canvas.height = layout.viewHeight * 2
      const ctx = canvas.getContext('2d')!
      ctx.scale(2, 2)
      ctx.fillStyle = '#0f2744'
      ctx.fillRect(0, 0, layout.viewWidth, layout.viewHeight)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      const pngUrl = canvas.toDataURL('image/png')
      const showSaveDialog = (window as any).file?.showSaveDialog
      if (showSaveDialog) {
        const result = await showSaveDialog({
          title: '导出面包板 PNG',
          defaultPath: `${schema?.meta.name ?? 'breadboard'}_breadboard.png`,
          filters: [{ name: 'PNG Image', extensions: ['png'] }],
        })
        if (!result.canceled && result.filePath) {
          const base64 = pngUrl.split(',')[1]
          await (window as any).file.writeFile(result.filePath, `data:image/png;base64,${base64}`)
        }
      }
    } catch (e: any) { alert(`导出失败: ${e.message}`) }
  }, [layout, schema])

  if (!schema) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#0f2744',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 10, color: '#ffffff', letterSpacing: '.18em', fontFamily: 'monospace' }}>
          面包板视图
        </div>
        <div style={{ fontSize: 9, color: '#cccccc', letterSpacing: '.1em', fontFamily: 'monospace' }}>
          等待 AI 生成项目...
        </div>
      </div>
    )
  }

  if (!layout) return null

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#0f2744', overflow: 'hidden', position: 'relative', cursor: dragging.current ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      {/* Top-left info */}
      <div style={{
        position: 'absolute', top: 8, left: 12, zIndex: 10,
        fontFamily: '"JetBrains Mono",monospace', fontSize: 8,
        color: '#9aabb8', letterSpacing: '.08em',
        background: '#0a1628', border: '1px solid #1e3a5f',
        borderRadius: 4, padding: '3px 8px',
      }}>
        面包板视图 | {schema.components.length} 芯片 | {schema.connections.length} 连线
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10, display: 'flex', gap: 4 }}>
        <button onClick={resetView} style={{
          fontFamily: '"JetBrains Mono",monospace', fontSize: 7, fontWeight: 700,
          letterSpacing: '.06em', padding: '3px 8px', borderRadius: 4,
          cursor: 'pointer', border: '1px solid #2a4a6f', color: '#9aabb8',
          background: '#0a1628', transition: 'all .15s',
        }}>重置视图</button>
        <button onClick={handleExportPNG} style={{
          fontFamily: '"JetBrains Mono",monospace', fontSize: 7, fontWeight: 700,
          letterSpacing: '.08em', padding: '3px 8px', borderRadius: 4,
          cursor: 'pointer', border: '1px solid #00ff9d40', color: '#00ff9d',
          background: '#0a2a1a', transition: 'all .15s',
        }}>导出 PNG</button>
      </div>

      {/* Scale indicator */}
      <div style={{
        position: 'absolute', bottom: 10, right: 14, zIndex: 10,
        fontFamily: '"JetBrains Mono",monospace', fontSize: 7,
        color: '#3a5a7a', letterSpacing: '.06em',
      }}>
        {Math.round(scale * 100)}%
      </div>

      <div style={{
        position: 'absolute', bottom: 10, left: 14, zIndex: 10,
        fontFamily: '"JetBrains Mono",monospace', fontSize: 7,
        color: '#3a5a7a', letterSpacing: '.06em',
      }}>
        拖动平移 · 滚轮缩放
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${layout.viewWidth} ${layout.viewHeight}`}
        style={{
          position: 'absolute', top: 0, left: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      >
        <g>
          <rect x={COL} y={0} width={COL * 2.5} height={layout.viewHeight}
            fill="#ef444408" />
          <rect x={COL * 3.8} y={0} width={COL * 2.5} height={layout.viewHeight}
            fill="#6b728008" />
          <text x={COL * 1.8} y={12} textAnchor="middle" fill="#ef444460"
            fontSize={6} fontFamily='"JetBrains Mono",monospace"' fontWeight={700}>+</text>
          <text x={COL * 1.8} y={layout.viewHeight - 4} textAnchor="middle" fill="#ef444460"
            fontSize={6} fontFamily='"JetBrains Mono",monospace"' fontWeight={700}>+</text>
          <text x={COL * 4.8} y={12} textAnchor="middle" fill="#6b728060"
            fontSize={6} fontFamily='"JetBrains Mono",monospace"' fontWeight={700}>-</text>
          <text x={COL * 4.8} y={layout.viewHeight - 4} textAnchor="middle" fill="#6b728060"
            fontSize={6} fontFamily='"JetBrains Mono",monospace"' fontWeight={700}>-</text>
        </g>

        <rect x={COL * 5} y={0} width={layout.viewWidth} height={layout.viewHeight}
          fill="#0d1e33" opacity={0.3} />

        {layout.elements.map((el, i) => renderEl(el, i))}
      </svg>
    </div>
  )
}
