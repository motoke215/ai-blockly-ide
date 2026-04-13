import React, { useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  BaseEdge,
  EdgeLabelRenderer,
  ReactFlowProvider,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { AIProjectSchema, Component, ComponentType, PinDefinition } from '../../shared/types/project.schema'
import { getComponentImage } from '../../shared/component-images'

const WIRE_COLORS: Record<string, string> = {
  red:'#ef4444', black:'#6b7280', yellow:'#fbbf24', blue:'#60a5fa',
  orange:'#fb923c', green:'#4ade80', white:'#e5e7eb', purple:'#c084fc',
}

const TYPE_COLORS: Record<ComponentType, string> = {
  mcu:'#00ff9d', sensor:'#60a5fa', actuator:'#fb923c',
  display:'#c084fc', power:'#ef4444', passive:'#9ca3af',
}

const NODE_WIDTH = 260
const HEADER_HEIGHT = 104
const ROW_HEIGHT = 30
const BODY_PAD = 12
const VIEW_CENTER_Y = 360
const LEFT_X = 48
const MCU_X = 460
const RIGHT_X = 940
const ROUTE_STEP = 22
const LEFT_LANE_START_X = 300
const RIGHT_LANE_START_X = 760
const TRUNK_OFFSET_STEP = 10
const MID_SPREAD_STEP = 6

function colorForPin(pin: Pick<PinDefinition, 'name' | 'type'>, fallback: string) {
  const upper = pin.name.toUpperCase()
  if (/VCC|3V3|5V/.test(upper) || pin.type === 'power') return '#ef4444'
  if (/GND/.test(upper) || pin.type === 'ground') return '#6b7280'
  if (pin.type === 'i2c_sda' || upper.includes('SDA')) return '#60a5fa'
  if (pin.type === 'i2c_scl' || upper.includes('SCL')) return '#fb923c'
  if (pin.type === 'uart_tx' || upper.includes('TX')) return '#4ade80'
  if (pin.type === 'uart_rx' || upper.includes('RX')) return '#f472b6'
  return fallback
}

function edgeColor(conn: AIProjectSchema['connections'][number]) {
  const p = conn.source.pinName.toUpperCase()
  if (conn.wireColor && WIRE_COLORS[conn.wireColor]) return WIRE_COLORS[conn.wireColor]
  if (['VCC', '3V3', '5V'].includes(p)) return '#ef4444'
  if (p === 'GND') return '#6b7280'
  if (p.includes('SDA')) return '#60a5fa'
  if (p.includes('SCL')) return '#fb923c'
  if (p.includes('TX')) return '#4ade80'
  if (p.includes('RX')) return '#f472b6'
  return '#fbbf24'
}

function signalGroup(pinName: string) {
  const upper = pinName.toUpperCase()
  if (upper.includes('GND')) return 'gnd'
  if (/VCC|3V3|5V/i.test(upper)) return 'power'
  if (upper.includes('SDA')) return 'sda'
  if (upper.includes('SCL')) return 'scl'
  if (upper.includes('TX')) return 'tx'
  if (upper.includes('RX')) return 'rx'
  return 'signal'
}

function splitPins(pins: PinDefinition[], type: ComponentType) {
  if (type === 'mcu') {
    const half = Math.ceil(pins.length / 2)
    return { left: pins.slice(0, half), right: pins.slice(half) }
  }
  const left = pins.filter(pin => pin.type === 'power' || pin.type === 'ground')
  const right = pins.filter(pin => pin.type !== 'power' && pin.type !== 'ground')
  return left.length ? { left, right } : { left: [], right: pins }
}

function getNodeHeight(comp: Component) {
  const groups = splitPins(comp.pins, comp.type)
  return HEADER_HEIGHT + Math.max(groups.left.length, groups.right.length) * ROW_HEIGHT + BODY_PAD * 2
}

function classifyComponent(comp: Component): 'display' | 'sensor' | 'actuator' | 'power' | 'passive' {
  if (comp.type === 'display') return 'display'
  if (comp.type === 'actuator') return 'actuator'
  if (comp.type === 'power') return 'power'
  if (comp.type === 'passive') return 'passive'
  return 'sensor'
}

function buildLayout(schema: AIProjectSchema): Node[] {
  const mcu = schema.components.find(comp => comp.type === 'mcu')
  const others = schema.components.filter(comp => comp.type !== 'mcu')
  if (!mcu) return []

  const groups = {
    display: others.filter(c => classifyComponent(c) === 'display'),
    sensor: others.filter(c => classifyComponent(c) === 'sensor'),
    actuator: others.filter(c => classifyComponent(c) === 'actuator'),
    power: others.filter(c => classifyComponent(c) === 'power'),
    passive: others.filter(c => classifyComponent(c) === 'passive'),
  }

  const leftStack = [...groups.power, ...groups.sensor]
  const rightStack = [...groups.display, ...groups.actuator, ...groups.passive]

  const placeColumn = (components: Component[], x: number, centerY: number) => {
    const gap = 28
    const totalHeight = components.reduce((sum, comp) => sum + getNodeHeight(comp), 0) + Math.max(components.length - 1, 0) * gap
    let cursorY = centerY - totalHeight / 2
    return components.map(comp => {
      const height = getNodeHeight(comp)
      const node: Node = {
        id: comp.id,
        type: 'pinChip',
        position: { x, y: cursorY },
        draggable: true,
        data: { component: comp },
      }
      cursorY += height + gap
      return node
    })
  }

  const leftNodes = placeColumn(leftStack, LEFT_X, VIEW_CENTER_Y)
  const rightNodes = placeColumn(rightStack, RIGHT_X, VIEW_CENTER_Y)
  const mcuHeight = getNodeHeight(mcu)
  const mcuNode: Node = {
    id: mcu.id,
    type: 'pinChip',
    position: { x: MCU_X, y: VIEW_CENTER_Y - mcuHeight / 2 },
    draggable: true,
    data: { component: mcu },
  }

  return [...leftNodes, mcuNode, ...rightNodes]
}

function handleId(side: 'left' | 'right', pinName: string) {
  return `${side}__${pinName}`
}

function sideForPin(component: Component, pinName: string): 'left' | 'right' {
  const { left, right } = splitPins(component.pins, component.type)
  if (left.some(pin => pin.name === pinName)) return 'left'
  if (right.some(pin => pin.name === pinName)) return 'right'
  return component.type === 'mcu' ? 'right' : 'left'
}

function PinChipNode({ data, selected }: NodeProps<{ component: Component }>) {
  const comp = data.component
  const accent = TYPE_COLORS[comp.type]
  const imageUrl = getComponentImage(comp.model)
  const [imgFailed, setImgFailed] = useState(false)
  const imageVisible = !!imageUrl && !imgFailed
  const { left, right } = useMemo(() => splitPins(comp.pins, comp.type), [comp.pins, comp.type])
  const rows = Math.max(left.length, right.length)

  const renderPin = (pin: PinDefinition, side: 'left' | 'right') => {
    const color = colorForPin(pin, accent)
    const isLeft = side === 'left'
    return (
      <div
        key={`${side}-${pin.name}`}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isLeft ? 'flex-start' : 'flex-end',
          flexDirection: isLeft ? 'row' : 'row-reverse',
          height: ROW_HEIGHT,
          paddingLeft: isLeft ? 14 : 8,
          paddingRight: isLeft ? 8 : 14,
          gap: 5,
        }}
      >
        <div style={{ width: 8, height: 2, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}90` }} />
        <span
          style={{
            fontSize: 9,
            color: '#e6f0ff',
            fontFamily: '"JetBrains Mono",monospace',
            letterSpacing: '.04em',
            textAlign: isLeft ? 'left' : 'right',
            flex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {pin.name}
          {pin.gpioNum !== undefined && <span style={{ color: '#8fb3d9', marginLeft: 6, fontWeight: 700 }}>GPIO{pin.gpioNum}</span>}
        </span>
        <Handle
          type={isLeft ? 'target' : 'source'}
          position={isLeft ? Position.Left : Position.Right}
          id={handleId(side, pin.name)}
          style={{
            width: 8,
            height: 8,
            background: color,
            border: 'none',
            boxShadow: `0 0 7px ${color}`,
            left: isLeft ? -4 : undefined,
            right: isLeft ? undefined : -4,
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        width: NODE_WIDTH,
        background: '#0a1220',
        border: `1px solid ${accent}55`,
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: '"JetBrains Mono",monospace',
        boxShadow: selected ? `0 0 24px ${accent}55` : `0 0 14px ${accent}22`,
        transition: 'box-shadow .18s ease',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: HEADER_HEIGHT,
          background: imageVisible
            ? 'linear-gradient(180deg, rgba(3,8,16,.1), rgba(3,8,16,.9))'
            : 'linear-gradient(135deg,#15263f,#0d1523 70%)',
          borderBottom: `1px solid ${accent}33`,
        }}
      >
        {imageVisible && (
          <img
            src={imageUrl}
            alt={comp.model}
            onError={() => setImgFailed(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,8,16,.15), rgba(3,8,16,.92))' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '10px 12px', display: 'flex', height: '100%', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: accent }}>{comp.label}</div>
            <span style={{ fontSize: 6.5, color: '#08111d', background: accent, borderRadius: 999, padding: '2px 7px', fontWeight: 700 }}>
              {comp.type.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 8, color: '#c5d7eb', letterSpacing: '.04em' }}>{comp.model}</div>
          <div style={{ fontSize: 7, color: '#7c98b5', letterSpacing: '.08em' }}>
            {comp.pins.length} PINS · {classifyComponent(comp).toUpperCase()} ZONE
          </div>
        </div>
      </div>

      <div
        style={{
          background: '#0b1424',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          minHeight: rows * ROW_HEIGHT + BODY_PAD * 2,
          padding: `${BODY_PAD}px 0`,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: '50%', top: 8, bottom: 8, width: 1, background: `linear-gradient(to bottom, transparent, ${accent}30, transparent)` }} />
        <div>{left.map(pin => renderPin(pin, 'left'))}</div>
        <div>{right.map(pin => renderPin(pin, 'right'))}</div>
      </div>
    </div>
  )
}

function orthogonalPath(sourceX: number, sourceY: number, targetX: number, targetY: number, laneX: number, midSourceX: number, midTargetX: number) {
  return `M ${sourceX} ${sourceY} L ${midSourceX} ${sourceY} L ${laneX} ${sourceY} L ${laneX} ${targetY} L ${midTargetX} ${targetY} L ${targetX} ${targetY}`
}

function OrthogonalEdge(props: EdgeProps) {
  const data = (props.data ?? {}) as {
    laneX?: number
    color?: string
    label?: string
    midSourceX?: number
    midTargetX?: number
  }
  const laneX = data.laneX ?? (props.sourceX + props.targetX) / 2
  const color = data.color ?? '#fbbf24'
  const midSourceX = data.midSourceX ?? laneX
  const midTargetX = data.midTargetX ?? laneX
  const d = orthogonalPath(props.sourceX, props.sourceY, props.targetX, props.targetY, laneX, midSourceX, midTargetX)
  const labelX = laneX + 10
  const labelY = (props.sourceY + props.targetY) / 2 - 10

  return (
    <>
      <BaseEdge path={d} style={{ stroke: color, strokeWidth: 2.2, strokeLinejoin: 'round', strokeLinecap: 'round' }} />
      <path d={d} fill="none" stroke={color} strokeWidth={5.5} opacity={0.08} strokeLinejoin="round" strokeLinecap="round" />
      {data.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              fontFamily: '"JetBrains Mono",monospace',
              fontSize: 8,
              color,
              background: '#08111dcc',
              border: `1px solid ${color}35`,
              borderRadius: 4,
              padding: '2px 5px',
              letterSpacing: '.04em',
              whiteSpace: 'nowrap',
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const NODE_TYPES = { pinChip: PinChipNode }
const EDGE_TYPES = { orth: OrthogonalEdge }

function buildEdges(schema: AIProjectSchema): Edge[] {
  const leftLaneCounters = new Map<string, number>()
  const rightLaneCounters = new Map<string, number>()
  const pairCounters = new Map<string, number>()
  const nextLane = (map: Map<string, number>, group: string) => {
    const current = map.get(group) ?? 0
    map.set(group, current + 1)
    return current
  }
  const nextPairIndex = (sourceId: string, targetId: string) => {
    const key = `${sourceId}__${targetId}`
    const current = pairCounters.get(key) ?? 0
    pairCounters.set(key, current + 1)
    return current
  }

  return schema.connections
    .map(conn => {
      const sourceComp = schema.components.find(comp => comp.id === conn.source.componentId)
      const targetComp = schema.components.find(comp => comp.id === conn.target.componentId)
      if (!sourceComp || !targetComp) return null

      const sourceIsMcu = sourceComp.type === 'mcu'
      const targetIsMcu = targetComp.type === 'mcu'
      const color = edgeColor(conn)
      const label = `${conn.source.pinName} → ${conn.target.pinName}`
      const pairIndex = nextPairIndex(conn.source.componentId, conn.target.componentId)
      const spread = ((pairIndex % 8) - 3.5) * MID_SPREAD_STEP

      let source = conn.source.componentId
      let sourceHandle = handleId(sideForPin(sourceComp, conn.source.pinName), conn.source.pinName)
      let target = conn.target.componentId
      let targetHandle = handleId(sideForPin(targetComp, conn.target.pinName), conn.target.pinName)
      let laneX = (LEFT_LANE_START_X + RIGHT_LANE_START_X) / 2
      let midSourceX = laneX
      let midTargetX = laneX

      if (!sourceIsMcu && targetIsMcu) {
        const sourceSide = sideForPin(sourceComp, conn.source.pinName)
        const targetSide = sideForPin(targetComp, conn.target.pinName)
        sourceHandle = handleId(sourceSide, conn.source.pinName)
        targetHandle = handleId(targetSide, conn.target.pinName)
        const group = signalGroup(conn.source.pinName)
        const laneIndex = nextLane(leftLaneCounters, `${group}-${targetSide}`)
        laneX = (sourceSide === 'right' ? LEFT_LANE_START_X : LEFT_LANE_START_X - 28) + laneIndex * ROUTE_STEP
        midSourceX = sourceComp.position?.x
          ? sourceComp.position.x + (sourceSide === 'right' ? NODE_WIDTH + 18 : -18) + spread
          : laneX
        midTargetX = targetComp.position?.x
          ? targetComp.position.x + (targetSide === 'left' ? -22 : NODE_WIDTH + 22) - spread - laneIndex * TRUNK_OFFSET_STEP
          : laneX
      } else if (sourceIsMcu && !targetIsMcu) {
        const sourceSide = sideForPin(sourceComp, conn.source.pinName)
        const targetSide = sideForPin(targetComp, conn.target.pinName)
        sourceHandle = handleId(sourceSide, conn.source.pinName)
        targetHandle = handleId(targetSide, conn.target.pinName)
        const group = signalGroup(conn.source.pinName)
        const laneIndex = nextLane(rightLaneCounters, `${group}-${sourceSide}`)
        laneX = (targetSide === 'left' ? RIGHT_LANE_START_X : RIGHT_LANE_START_X + 28) + laneIndex * ROUTE_STEP
        midSourceX = sourceComp.position?.x
          ? sourceComp.position.x + (sourceSide === 'left' ? -22 : NODE_WIDTH + 22) - spread - laneIndex * TRUNK_OFFSET_STEP
          : laneX
        midTargetX = targetComp.position?.x
          ? targetComp.position.x + (targetSide === 'left' ? -18 : NODE_WIDTH + 18) + spread
          : laneX
      } else if (!sourceIsMcu && !targetIsMcu) {
        const sourceSide = sideForPin(sourceComp, conn.source.pinName)
        const targetSide = sideForPin(targetComp, conn.target.pinName)
        sourceHandle = handleId(sourceSide, conn.source.pinName)
        targetHandle = handleId(targetSide, conn.target.pinName)
        const group = signalGroup(conn.source.pinName)
        const laneIndex = nextLane(leftLaneCounters, `cross-${group}-${sourceSide}-${targetSide}`)
        laneX = LEFT_LANE_START_X + 120 + laneIndex * ROUTE_STEP
        midSourceX = sourceComp.position?.x
          ? sourceComp.position.x + (sourceSide === 'right' ? NODE_WIDTH + 14 : -14) + spread
          : laneX
        midTargetX = targetComp.position?.x
          ? targetComp.position.x + (targetSide === 'left' ? -14 : NODE_WIDTH + 14) - spread
          : laneX
      } else {
        const sourceSide = sideForPin(sourceComp, conn.source.pinName)
        const targetSide = sideForPin(targetComp, conn.target.pinName)
        sourceHandle = handleId(sourceSide, conn.source.pinName)
        targetHandle = handleId(targetSide, conn.target.pinName)
        const group = signalGroup(conn.source.pinName)
        const laneIndex = nextLane(rightLaneCounters, `mcu-${group}-${sourceSide}-${targetSide}`)
        laneX = MCU_X + NODE_WIDTH + 40 + laneIndex * ROUTE_STEP
        midSourceX = sourceComp.position?.x
          ? sourceComp.position.x + (sourceSide === 'left' ? -18 : NODE_WIDTH + 18) - spread - laneIndex * TRUNK_OFFSET_STEP
          : laneX
        midTargetX = targetComp.position?.x
          ? targetComp.position.x + (targetSide === 'left' ? -18 : NODE_WIDTH + 18) + spread
          : laneX
      }

      return {
        id: conn.id,
        type: 'orth',
        source,
        target,
        sourceHandle,
        targetHandle,
        style: { stroke: color },
        data: { laneX, color, label, midSourceX, midTargetX },
      } satisfies Edge
    })
    .filter(Boolean) as Edge[]
}

interface Props {
  schema: AIProjectSchema | null
}

function PinConnectionCanvasInner({ schema }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (!schema) {
      setNodes([])
      setEdges([])
      return
    }
    setNodes(buildLayout(schema))
    setEdges(buildEdges(schema))
  }, [schema, setNodes, setEdges])

  if (!schema) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#08111d',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <div style={{ fontSize: 10, color: '#ffffff', letterSpacing: '.18em', fontFamily: 'monospace' }}>引脚连接图</div>
        <div style={{ fontSize: 9, color: '#8aa0b5', letterSpacing: '.1em', fontFamily: 'monospace' }}>等待 AI 生成项目...</div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'radial-gradient(circle at top, #0f2037, #08111d 62%)',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#16304f" />
        <Controls style={{ background: '#08111d', border: '1px solid #16304f', borderRadius: 8 }} />
        <Panel position="top-left">
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              background: '#08111de8',
              border: '1px solid #16304f',
              borderRadius: 6,
              padding: '6px 10px',
              fontFamily: '"JetBrains Mono",monospace',
            }}
          >
            <span style={{ fontSize: 8, color: '#b8cbdd', letterSpacing: '.08em' }}>
              详细引脚接线图 | {schema.components.length} 芯片 | {schema.connections.length} 条独立连接 | 当前渲染 {edges.length} 条
            </span>
            <span style={{ fontSize: 7, color: '#ef4444' }}>■ 电源</span>
            <span style={{ fontSize: 7, color: '#6b7280' }}>■ 地线</span>
            <span style={{ fontSize: 7, color: '#60a5fa' }}>■ SDA</span>
            <span style={{ fontSize: 7, color: '#fb923c' }}>■ SCL</span>
            <span style={{ fontSize: 7, color: '#fbbf24' }}>■ 独立信号</span>
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
