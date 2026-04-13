// src/modules/wiring/schema-to-flow.ts
import type { Node, Edge } from 'reactflow'
import type { AIProjectSchema, Component, Connection } from '../../shared/types/project.schema'

const WIRE_COLORS: Record<string, string> = {
  red:'#ef4444',black:'#6b7280',yellow:'#fbbf24',blue:'#60a5fa',
  orange:'#fb923c',green:'#4ade80',white:'#e5e7eb',purple:'#c084fc',
}
export const PIN_TYPE_COLORS: Record<string, string> = {
  power:'#ef4444',ground:'#6b7280',digital:'#4ade80',analog:'#fbbf24',
  i2c_sda:'#60a5fa',i2c_scl:'#fb923c',spi_mosi:'#c084fc',
  spi_miso:'#a78bfa',spi_clk:'#f472b6',uart_tx:'#4ade80',uart_rx:'#f472b6',
}

export function makeHandleId(compId: string, pinName: string) { return `${compId}__${pinName}` }

function autoLayout(components: Component[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>()
  const sorted = [...components].sort((a, b) => a.type === 'mcu' ? -1 : b.type === 'mcu' ? 1 : 0)
  sorted.forEach((comp, idx) => {
    if (comp.position) { map.set(comp.id, comp.position); return }
    const col = idx % 3, row = Math.floor(idx / 3)
    map.set(comp.id, { x: col * 280 + 60, y: row * 220 + 60 })
  })
  return map
}

function wireColor(conn: Connection): string {
  if (conn.wireColor && WIRE_COLORS[conn.wireColor]) return WIRE_COLORS[conn.wireColor]
  const p = conn.source.pinName.toUpperCase()
  if (['VCC','3V3','5V'].includes(p)) return '#ef4444'
  if (p === 'GND') return '#6b7280'
  if (p.includes('SDA')) return '#60a5fa'
  if (p.includes('SCL')) return '#fb923c'
  if (p.includes('TX'))  return '#4ade80'
  return '#fbbf24'
}

export function schemaToFlow(schema: AIProjectSchema): { nodes: Node[]; edges: Edge[] } {
  const positions = autoLayout(schema.components)
  const nodes: Node[] = schema.components.map(comp => ({
    id: comp.id, type: 'chipNode', position: positions.get(comp.id)!,
    data: { label: comp.label, model: comp.model, type: comp.type, pins: comp.pins },
    draggable: true,
  }))
  const edges: Edge[] = schema.connections.map(conn => {
    const color = wireColor(conn)
    const isPower = ['VCC','3V3','5V','GND'].includes(conn.source.pinName.toUpperCase())
    return {
      id: conn.id,
      source: conn.source.componentId, target: conn.target.componentId,
      sourceHandle: makeHandleId(conn.source.componentId, conn.source.pinName),
      targetHandle: makeHandleId(conn.target.componentId, conn.target.pinName),
      type: 'smoothstep', animated: isPower,
      style: { stroke: color, strokeWidth: isPower ? 2.5 : 1.8, opacity: 0.88 },
      markerEnd: { type: 'arrowclosed' as const, color, width: 8, height: 8 },
      label: conn.source.pinName,
      labelStyle: { fill: color, fontSize: 8, fontFamily: 'monospace' },
      labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.75 },
    }
  })
  return { nodes, edges }
}
