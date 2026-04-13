// src/modules/wiring/PinConnectionCanvas.tsx
// 引脚连接图：展示元器件引脚标签和具体接线的示意图（效果图风格）
import React, { useMemo, useCallback } from 'react'
import ReactFlow, { Background, BackgroundVariant, Controls, Panel,
  type Node, type Edge, type NodeProps, useNodesState, useEdgesState,
  Handle, Position, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'

const WIRE_COLORS: Record<string, string> = {
  red:'#ef4444', black:'#6b7280', yellow:'#fbbf24', blue:'#60a5fa',
  orange:'#fb923c', green:'#4ade80', white:'#e5e7eb', purple:'#c084fc',
}
const TYPE_COLORS: Record<string, string> = {
  mcu:'#00ff9d', sensor:'#00e5ff', actuator:'#ffd700', display:'#c084fc',
  power:'#ef4444', passive:'#5a7a9a', module:'#00e5ff',
}

// ── 引脚节点 ────────────────────────────────────────────────────────────────
function PinNode({ data }: NodeProps) {
  const { label, model, type, pins } = data as {
    label: string; model: string; type: string; pins: { name: string; gpioNum?: number }[]
  }
  const color = TYPE_COLORS[type] ?? '#00ff9d'
  const half = Math.ceil(pins.length / 2)

  return (
    <div style={{
      background: '#0d1e33',
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      minWidth: 120,
      fontFamily: '"JetBrains Mono",monospace',
      boxShadow: `0 0 12px ${color}30`,
    }}>
      {/* Header */}
      <div style={{
        background: `${color}22`,
        borderBottom: `1px solid ${color}40`,
        padding: '5px 10px',
        borderRadius: '4px 4px 0 0',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 7, color: '#5a7a9a', marginTop: 1 }}>{model}</div>
      </div>

      {/* Pins */}
      <div style={{ display: 'flex', padding: '4px 0' }}>
        {/* Left pins */}
        <div style={{ flex: 1, padding: '2px 6px' }}>
          {pins.slice(0, half).map((pin, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: pin.name.match(/VCC|3V3|5V/i) ? '#ef4444'
                         : pin.name.match(/GND/i) ? '#6b7280'
                         : color,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 7.5, color: '#e0e0e0', letterSpacing: '0.03em' }}>{pin.name}</span>
              {pin.gpioNum !== undefined && (
                <span style={{ fontSize: 6, color: '#5a7a9a' }}>GPIO{pin.gpioNum}</span>
              )}
            </div>
          ))}
        </div>
        {/* Right pins */}
        <div style={{ flex: 1, padding: '2px 6px' }}>
          {pins.slice(half).map((pin, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3, justifyContent: 'flex-end' }}>
              {pin.gpioNum !== undefined && (
                <span style={{ fontSize: 6, color: '#5a7a9a' }}>GPIO{pin.gpioNum}</span>
              )}
              <span style={{ fontSize: 7.5, color: '#e0e0e0', letterSpacing: '0.03em' }}>{pin.name}</span>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: pin.name.match(/VCC|3V3|5V/i) ? '#ef4444'
                         : pin.name.match(/GND/i) ? '#6b7280'
                         : color,
                flexShrink: 0,
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Hidden ReactFlow handles (used for edge connections) */}
      {pins.map((pin, i) => (
        <React.Fragment key={`h_l_${i}`}>
          <Handle
            type="source"
            position={Position.Left}
            id={`l_${pin.name}`}
            style={{ top: `${((i + 0.5) / pins.length) * 100}%`, background: color, border: 'none', width: 6, height: 6 }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id={`r_${pin.name}`}
            style={{ top: `${((i + 0.5) / pins.length) * 100}%`, background: color, border: 'none', width: 6, height: 6 }}
          />
        </React.Fragment>
      ))}
    </div>
  )
}

const NODE_TYPES = { pinNode: PinNode }

// ── 自动布局 ──────────────────────────────────────────────────────────────
function autoLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  // 分类：MCU放左侧，其他放右侧
  const mcus = nodes.filter(n => n.data.type === 'mcu')
  const others = nodes.filter(n => n.data.type !== 'mcu')

  const GAP_X = 320
  const GAP_Y = 80
  const START_X = 60
  const START_Y = 60

  // MCU 放左侧，中心排列
  const mcuStartY = START_Y + Math.floor((others.length * GAP_Y) / 2)
  mcus.forEach((n, i) => {
    n.position = { x: START_X, y: mcuStartY + i * 200 }
  })

  // 其他放右侧
  others.forEach((n, i) => {
    n.position = { x: START_X + GAP_X, y: START_Y + i * GAP_Y }
  })

  return { nodes, edges }
}

// ── 主组件 ────────────────────────────────────────────────────────────────
interface PinConnectionCanvasProps {
  schema: import('../../shared/types/project.schema').AIProjectSchema | null
}

export function PinConnectionCanvas({ schema }: PinConnectionCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // Rebuild nodes/edges when schema changes
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!schema) return { initialNodes: [], initialEdges: [] }

    const initialNodes: Node[] = schema.components.map((comp, idx) => ({
      id: comp.id,
      type: 'pinNode',
      position: { x: 0, y: 0 },  // will be set by autoLayout
      data: {
        label: comp.label,
        model: comp.model,
        type: comp.type,
        pins: comp.pins,
      },
      draggable: true,
    }))

    const initialEdges: Edge[] = schema.connections.map(conn => {
      const p = conn.source.pinName.toUpperCase()
      const isPower = ['VCC','3V3','5V','GND'].includes(p)
      const color = (() => {
        if (conn.wireColor && WIRE_COLORS[conn.wireColor]) return WIRE_COLORS[conn.wireColor]
        if (['VCC','3V3','5V'].includes(p)) return '#ef4444'
        if (p === 'GND') return '#6b7280'
        if (p.includes('SDA')) return '#60a5fa'
        if (p.includes('SCL')) return '#fb923c'
        if (p.includes('TX')) return '#4ade80'
        if (p.includes('RX')) return '#f472b6'
        return '#fbbf24'
      })()

      return {
        id: conn.id,
        source: conn.source.componentId,
        target: conn.target.componentId,
        sourceHandle: `r_${conn.source.pinName}`,
        targetHandle: `l_${conn.target.pinName}`,
        type: 'smoothstep',
        animated: isPower,
        style: { stroke: color, strokeWidth: 1.8, opacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 10, height: 10 },
        label: conn.source.pinName,
        labelStyle: { fill: color, fontSize: 8, fontFamily: '"JetBrains Mono",monospace' },
        labelBgStyle: { fill: '#0f2744', fillOpacity: 0.9 },
      }
    })

    const laid = autoLayout(initialNodes, initialEdges)
    return { initialNodes: laid.nodes, initialEdges: laid.edges }
  }, [schema])

  React.useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  if (!schema) {
    return (
      <div style={{
        width: '100%', height: '100%', background: '#0f2744',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 10, color: '#ffffff', letterSpacing: '.18em', fontFamily: 'monospace' }}>
          引脚连接图
        </div>
        <div style={{ fontSize: 9, color: '#cccccc', letterSpacing: '.1em', fontFamily: 'monospace' }}>
          等待 AI 生成项目...
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#0f2744', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { strokeWidth: 1.8, opacity: 0.85 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e3a5f" />
        <Controls
          style={{ background: '#0f2744', border: '1px solid #1e3a5f', borderRadius: 6 }}
        />
        <Panel position="top-left">
          <div style={{
            fontFamily: '"JetBrains Mono",monospace', fontSize: 8, color: '#9aabb8',
            letterSpacing: '.08em', background: '#0a1628', border: '1px solid #1e3a5f',
            borderRadius: 4, padding: '4px 10px',
          }}>
            引脚连接图 | {schema.components.length} 芯片 | {schema.connections.length} 连接
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
