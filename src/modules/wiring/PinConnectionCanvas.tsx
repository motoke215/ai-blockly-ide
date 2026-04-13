// src/modules/wiring/PinConnectionCanvas.tsx
// 引脚连接图：MCU居左纵向排列引脚，外设居右，引脚到引脚水平连线，电源线动态虚线
import React, { useEffect } from 'react'
import ReactFlow, { Background, BackgroundVariant, Controls, Panel,
  type Node, type Edge, type NodeProps,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType, ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'

const WIRE_COLORS: Record<string, string> = {
  red:'#ef4444', black:'#6b7280', yellow:'#fbbf24', blue:'#60a5fa',
  orange:'#fb923c', green:'#4ade80', white:'#e5e7eb', purple:'#c084fc',
}
const TYPE_COLORS: Record<string, string> = {
  mcu:'#00ff9d', sensor:'#00e5ff', actuator:'#ffd700', display:'#c084fc',
  power:'#ef4444', passive:'#5a7a9a', module:'#00e5ff',
}
const NODE_WIDTH = 130
const PIN_ROW_H = 18
const HEADER_H = 32
const PAD = 6
const MCU_X = 60
const PERIPH_X = 430

function pinColor(name: string, base: string) {
  if (/VCC|3V3|5V/i.test(name)) return '#ef4444'
  if (/GND/i.test(name)) return '#6b7280'
  return base
}

// ── MCU 节点：所有引脚在右侧显示，右侧引出连线 ─────────────────
function MCUNode({ data, id }: NodeProps) {
  const { label, model, type, pins } = data as {
    label: string; model: string; type: string
    pins: { name: string; gpioNum?: number }[]
  }
  const color = TYPE_COLORS[type] ?? '#00ff9d'

  return (
    <div style={{
      background: '#0d1e33',
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      width: NODE_WIDTH,
      fontFamily: '"JetBrains Mono",monospace',
      boxShadow: `0 0 16px ${color}30`,
    }}>
      <div style={{
        background: `${color}22`,
        borderBottom: `1px solid ${color}40`,
        padding: '4px 8px',
        borderRadius: '4px 4px 0 0',
        height: HEADER_H,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 7, color: '#5a7a9a' }}>{model}</div>
      </div>

      <div style={{ padding: `${PAD}px ${PAD}px ${PAD}px 0` }}>
        {pins.map((pin, i) => (
          <div key={i}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: PIN_ROW_H, position: 'relative' }}>
            <span style={{ fontSize: 7.5, color: '#e0e0e0', letterSpacing: '0.03em', zIndex: 1 }}>{pin.name}</span>
            {pin.gpioNum !== undefined && (
              <span style={{ fontSize: 6, color: '#5a7a9a', marginLeft: 3, zIndex: 1 }}>{pin.gpioNum}</span>
            )}
            {/* Source handle on right — used when MCU is connection source */}
            <Handle
              type="source"
              position={Position.Right}
              id={`src_${pin.name}`}
              style={{
                position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)',
                width: 7, height: 7,
                background: pinColor(pin.name, color),
                border: 'none', borderRadius: '50%',
                boxShadow: `0 0 5px ${pinColor(pin.name, color)}80`,
                zIndex: 2,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 外设节点：所有引脚在左侧显示，左侧引出连线 ─────────────────
function PeripheralNode({ data }: NodeProps) {
  const { label, model, type, pins } = data as {
    label: string; model: string; type: string
    pins: { name: string; gpioNum?: number }[]
  }
  const color = TYPE_COLORS[type] ?? '#00e5ff'

  return (
    <div style={{
      background: '#0d1e33',
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      width: NODE_WIDTH,
      fontFamily: '"JetBrains Mono",monospace',
      boxShadow: `0 0 16px ${color}30`,
    }}>
      <div style={{
        background: `${color}22`,
        borderBottom: `1px solid ${color}40`,
        padding: '4px 8px',
        borderRadius: '4px 4px 0 0',
        height: HEADER_H,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 7, color: '#5a7a9a' }}>{model}</div>
      </div>

      <div style={{ padding: `${PAD}px 0 ${PAD}px ${PAD}px` }}>
        {pins.map((pin, i) => (
          <div key={i}
            style={{ display: 'flex', alignItems: 'center', height: PIN_ROW_H, position: 'relative' }}>
            {/* Target handle on left — used when peripheral receives connection */}
            <Handle
              type="target"
              position={Position.Left}
              id={`tgt_${pin.name}`}
              style={{
                position: 'absolute', left: -3, top: '50%', transform: 'translateY(-50%)',
                width: 7, height: 7,
                background: pinColor(pin.name, color),
                border: 'none', borderRadius: '50%',
                boxShadow: `0 0 5px ${pinColor(pin.name, color)}80`,
                zIndex: 2,
              }}
            />
            <span style={{ fontSize: 7.5, color: '#e0e0e0', letterSpacing: '0.03em', zIndex: 1 }}>{pin.name}</span>
            {pin.gpioNum !== undefined && (
              <span style={{ fontSize: 6, color: '#5a7a9a', marginLeft: 3, zIndex: 1 }}>{pin.gpioNum}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const NODE_TYPES = { mcu: MCUNode, peripheral: PeripheralNode }

// ── 布局：MCU居左，引脚纵向展开；外设Y坐标与MCU对应引脚对齐 ───
function computeLayout(nodes: Node[]): Node[] {
  const mcu = nodes.find(n => n.data.type === 'mcu')
  const periphs = nodes.filter(n => n.data.type !== 'mcu')
  if (!mcu) return nodes

  const mcuPins = mcu.data.pins as { name: string }[]
  const MCU_H = HEADER_H + mcuPins.length * PIN_ROW_H + PAD * 2

  mcu.position = { x: MCU_X, y: 60 }

  periphs.forEach(n => {
    const pins = n.data.pins as { name: string }[]
    // 用第0根引脚与MCU第0根引脚对齐
    const refY = 60 + HEADER_H + PAD + PIN_ROW_H / 2
    const nodeCenter = HEADER_H / 2 + PAD
    n.position = { x: PERIPH_X, y: refY - nodeCenter }
  })

  return [...nodes]
}

// ── 主组件 ───────────────────────────────────────────────────────────
interface Props { schema: import('../../shared/types/project.schema').AIProjectSchema | null }

function PinConnectionCanvasInner({ schema }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (!schema) { setNodes([]); setEdges([]); return }

    const mcuNodes: Node[] = schema.components
      .filter(c => c.type === 'mcu')
      .map(c => ({ id: c.id, type: 'mcu', position: { x: 0, y: 0 }, data: { label: c.label, model: c.model, type: c.type, pins: c.pins }, draggable: true }))

    const periphNodes: Node[] = schema.components
      .filter(c => c.type !== 'mcu')
      .map(c => ({ id: c.id, type: 'peripheral', position: { x: 0, y: 0 }, data: { label: c.label, model: c.model, type: c.type, pins: c.pins }, draggable: true }))

    const laid = computeLayout([...mcuNodes, ...periphNodes])

    const newEdges: Edge[] = schema.connections.map(conn => {
      const srcComp = schema.components.find(c => c.id === conn.source.componentId)
      const isSrcMCU = srcComp?.type === 'mcu'
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
        sourceHandle: isSrcMCU ? `src_${conn.source.pinName}` : `tgt_${conn.source.pinName}`,
        targetHandle: isSrcMCU ? `tgt_${conn.target.pinName}` : `src_${conn.target.pinName}`,
        type: 'straight',
        animated: isPower,
        style: { stroke: color, strokeWidth: isPower ? 2.5 : 1.8, opacity: 0.88 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 9, height: 9 },
        label: isPower ? '' : conn.source.pinName,
        labelStyle: { fill: color, fontSize: 7.5, fontFamily: '"JetBrains Mono",monospace' },
        labelBgStyle: { fill: '#0f2744', fillOpacity: 0.9 },
      }
    })

    setNodes(laid)
    setEdges(newEdges)
  }, [schema, setNodes, setEdges])

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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e3a5f" />
        <Controls style={{ background: '#0f2744', border: '1px solid #1e3a5f', borderRadius: 6 }} />
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

export function PinConnectionCanvas({ schema }: Props) {
  return (
    <ReactFlowProvider>
      <PinConnectionCanvasInner schema={schema} />
    </ReactFlowProvider>
  )
}
