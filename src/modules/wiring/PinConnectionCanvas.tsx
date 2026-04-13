// src/modules/wiring/PinConnectionCanvas.tsx
// 引脚连接图：MCU居右、外设居左，同名引脚水平对齐，水平直线连接，电源线动态虚线
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

// 引脚颜色
function pinColor(name: string, base: string) {
  if (/VCC|3V3|5V/i.test(name)) return '#ef4444'
  if (/GND/i.test(name)) return '#6b7280'
  return base
}

// ── Pin label row：单行引脚标签（不上handle，handle在边缘）──────────
function PinLabel({ name, gpioNum, side, color }: {
  name: string; gpioNum?: number; side: 'left'|'right'; color: string
}) {
  const isLeft = side === 'left'
  const dot = pinColor(name, color)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 17,
      flexDirection: isLeft ? 'row-reverse' : 'row',
      gap: 3, position: 'relative',
    }}>
      {/* 引脚小横线 */}
      <div style={{
        width: 9, height: 2, background: dot,
        flexShrink: 0, borderRadius: 1,
        boxShadow: `0 0 4px ${dot}60`,
      }} />
      <span style={{
        fontSize: 7.5, color: '#e0e0e0',
        fontFamily: '"JetBrains Mono",monospace',
        letterSpacing: '0.02em',
      }}>{name}</span>
      {gpioNum !== undefined && (
        <span style={{ fontSize: 6, color: '#5a7a9a', fontFamily: '"JetBrains Mono",monospace' }}>
          {gpioNum}
        </span>
      )}
    </div>
  )
}

// ── MCU 节点：居右，引脚在左侧（边缘有handle）──────────────────────────
function MCUNode({ data }: NodeProps) {
  const { label, model, type, pins } = data as {
    label: string; model: string; type: string
    pins: { name: string; gpioNum?: number }[]
  }
  const color = TYPE_COLORS[type] ?? '#00ff9d'
  const PIN_H = 17
  const HEADER_H = 30
  const PAD = 6
  const totalH = HEADER_H + pins.length * PIN_H + PAD * 2

  return (
    <div style={{
      background: '#0d1e33',
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      fontFamily: '"JetBrains Mono",monospace',
      boxShadow: `0 0 16px ${color}30`,
    }}>
      {/* 顶部标签条 */}
      <div style={{
        background: color,
        borderRadius: '4px 4px 0 0',
        padding: '3px 10px',
        height: HEADER_H,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#0a0a0a', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 7, color: '#0a0a0a', opacity: 0.7 }}>{model}</div>
      </div>

      {/* 引脚列表 */}
      <div style={{ padding: `${PAD}px ${PAD}px ${PAD}px 0` }}>
        {pins.map((pin, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', height: PIN_H, position: 'relative' }}>
            {/* target handle — 左边缘，引脚线起点 */}
            <Handle
              type="target"
              position={Position.Left}
              id={`tgt_${pin.name}`}
              style={{
                position: 'absolute', left: -3, top: '50%', transform: 'translateY(-50%)',
                width: 7, height: 7, borderRadius: '50%',
                background: pinColor(pin.name, color),
                border: 'none',
                boxShadow: `0 0 5px ${pinColor(pin.name, color)}80`,
                zIndex: 2,
              }}
            />
            <PinLabel name={pin.name} gpioNum={pin.gpioNum} side="right" color={color} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 外设节点：居左，引脚在右侧（边缘有handle）──────────────────────────
function PeripheralNode({ data }: NodeProps) {
  const { label, model, type, pins } = data as {
    label: string; model: string; type: string
    pins: { name: string; gpioNum?: number }[]
  }
  const color = TYPE_COLORS[type] ?? '#00e5ff'
  const PIN_H = 17
  const HEADER_H = 30
  const PAD = 6

  return (
    <div style={{
      background: '#0d1e33',
      border: `1.5px solid ${color}`,
      borderRadius: 6,
      fontFamily: '"JetBrains Mono",monospace',
      boxShadow: `0 0 16px ${color}30`,
    }}>
      {/* 顶部标签条 */}
      <div style={{
        background: color,
        borderRadius: '4px 4px 0 0',
        padding: '3px 10px',
        height: HEADER_H,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#0a0a0a', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 7, color: '#0a0a0a', opacity: 0.7 }}>{model}</div>
      </div>

      {/* 引脚列表 */}
      <div style={{ padding: `${PAD}px 0 ${PAD}px ${PAD}px` }}>
        {pins.map((pin, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: PIN_H, position: 'relative' }}>
            <PinLabel name={pin.name} gpioNum={pin.gpioNum} side="left" color={color} />
            {/* source handle — 右边缘，引脚线起点 */}
            <Handle
              type="source"
              position={Position.Right}
              id={`src_${pin.name}`}
              style={{
                position: 'absolute', right: -3, top: '50%', transform: 'translateY(-50%)',
                width: 7, height: 7, borderRadius: '50%',
                background: pinColor(pin.name, color),
                border: 'none',
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

const NODE_TYPES = { mcu: MCUNode, peripheral: PeripheralNode }

// ── 布局计算 ───────────────────────────────────────────────────────────
// MCU居右，外设居左。
// 所有同名引脚必须水平对齐：遍历 schema 中所有引脚名称，按名称分组，
// 计算每个引脚名称在每个节点内的 Y 偏移，然后统一设置。
function computeLayout(nodes: Node[], schema: import('../../shared/types/project.schema').AIProjectSchema): Node[] {
  if (!schema || nodes.length === 0) return nodes

  // 收集所有引脚名称 → 在每个节点内的 localY（相对于该节点顶部标签下方）
  const PIN_H = 17
  const HEADER_H = 30
  const PAD = 6
  const LABEL_Y = HEADER_H + PAD  // 引脚列表开始 Y

  // 为每个节点建立 pin name → localY 的映射
  type PinYMap = Record<string, number>
  const nodePinY: Map<string, PinYMap> = new Map()
  nodes.forEach(node => {
    const pins = node.data.pins as { name: string }[]
    const map: PinYMap = {}
    pins.forEach((pin, i) => {
      map[pin.name.toUpperCase()] = LABEL_Y + i * PIN_H + PIN_H / 2
    })
    nodePinY.set(node.id, map)
  })

  // 找出所有出现过的引脚名称（去重，按首次出现顺序）
  const seenNames = new Set<string>()
  schema.components.forEach(c => c.pins.forEach(p => seenNames.add(p.name.toUpperCase())))

  // 每个引脚名称对应的"全局 Y"（以 MCU 的引脚 Y 为准）
  const mcuNode = nodes.find(n => n.data.type === 'mcu')
  if (!mcuNode) return nodes

  const mcuPinY = nodePinY.get(mcuNode.id)!
  const pinGlobalY: Record<string, number> = {}
  seenNames.forEach(name => {
    if (mcuPinY[name] !== undefined) {
      pinGlobalY[name] = mcuPinY[name]
    }
  })

  // MCU 放右侧
  const MAX_PIN_COUNT = Math.max(...nodes.map(n => (n.data.pins as { name: string }[]).length))
  const TOTAL_H = HEADER_H + PAD * 2 + MAX_PIN_COUNT * PIN_H

  // MCU 的 Y：从 layout 顶部开始
  const mcuY = 50
  mcuNode.position = { x: 480, y: mcuY }

  // 外设 Y：让每个外设的每个引脚与 MCU 的同名引脚 Y 对齐
  nodes.filter(n => n.data.type !== 'mcu').forEach(n => {
    const nPinY = nodePinY.get(n.id)!
    // 取第 0 根引脚作为对齐参考
    const firstPinName = (n.data.pins as { name: string }[])[0]?.name?.toUpperCase()
    if (firstPinName !== undefined && pinGlobalY[firstPinName] !== undefined) {
      const refGlobalY = pinGlobalY[firstPinName]
      // n 的第 0 根引脚的 localY
      const refLocalY = nPinY[firstPinName]
      n.position = { x: 60, y: mcuY + refGlobalY - refLocalY }
    } else {
      n.position = { x: 60, y: mcuY + HEADER_H }
    }
  })

  return nodes
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
      .map(c => ({
        id: c.id, type: 'mcu', position: { x: 0, y: 0 },
        data: { label: c.label, model: c.model, type: c.type, pins: c.pins },
        draggable: true,
      }))

    const periphNodes: Node[] = schema.components
      .filter(c => c.type !== 'mcu')
      .map(c => ({
        id: c.id, type: 'peripheral', position: { x: 0, y: 0 },
        data: { label: c.label, model: c.model, type: c.type, pins: c.pins },
        draggable: true,
      }))

    const laid = computeLayout([...mcuNodes, ...periphNodes], schema)

    // 构建边：外设 source → MCU target（同名引脚 handle）
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

      // 外设→MCU: peripheral=source(left handle), mcu=target(right handle)
      // MCU→外设: mcu=source(right handle), peripheral=target(left handle)
      return {
        id: conn.id,
        source: conn.source.componentId,
        target: conn.target.componentId,
        sourceHandle: isSrcMCU ? `src_${conn.source.pinName}` : `src_${conn.source.pinName}`,
        targetHandle: isSrcMCU ? `tgt_${conn.target.pinName}` : `tgt_${conn.target.pinName}`,
        type: 'straight',
        animated: isPower,
        style: { stroke: color, strokeWidth: isPower ? 2.5 : 1.8, opacity: 0.88 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 8, height: 8 },
        label: '',
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
        fitViewOptions={{ padding: 0.15 }}
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
