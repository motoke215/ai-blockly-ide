// src/modules/wiring/WiringCanvas.tsx
import { useCallback, useEffect } from 'react'
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap, Panel,
  type NodeTypes, type NodeChange, type EdgeChange, type Node, type Edge,
  useReactFlow } from 'reactflow'
import { ChipNode } from './nodes/ChipNode'
import { useAppStore } from '../../store/app.store'
import 'reactflow/dist/style.css'

const NODE_TYPES: NodeTypes = { chipNode: ChipNode }

interface WiringCanvasProps {
  nodes:            Node[]
  edges:            Edge[]
  onNodesChange:    (changes: NodeChange[]) => void
  onEdgesChange:    (changes: EdgeChange[]) => void
  onNodeDragStop?:  (id: string, pos: { x: number; y: number }) => void
}

// Inner component that has access to useReactFlow
function WiringCanvasInner({ nodes, edges, onNodesChange, onEdgesChange, onNodeDragStop }: WiringCanvasProps) {
  const { fitView, toPng } = useReactFlow()
  const registerCanvas = useAppStore(s => (s as any).registerCanvas)

  // Expose fitView and toPng to the store so FilePanel can use them
  useEffect(() => {
    registerCanvas?.({ fitView, toPng })
  }, [fitView, toPng, registerCanvas])

  const handleDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeDragStop?.(node.id, node.position)
  }, [onNodeDragStop])

  const isEmpty = nodes.length === 0

  return (
    <div style={{ width: '100%', height: '100%', background: '#0f2744', position: 'relative' }}>
      {isEmpty && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 6, zIndex: 10 }}>
          <div style={{ fontSize: 32, opacity: .1 }}>⬡</div>
          <div style={{ fontSize: 9, color: '#00e5ff', letterSpacing: '.18em', fontFamily: 'monospace' }}>布线画布</div>
          <div style={{ fontSize: 8, color: '#5a7a9a', letterSpacing: '.1em', fontFamily: 'monospace' }}>等待 AI 生成连线图...</div>
        </div>
      )}
      <ReactFlow
        nodes={nodes} edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeDragStop={handleDragStop}
        fitView fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15} maxZoom={2.5}
        snapToGrid snapGrid={[10, 10]}
        connectionLineStyle={{ stroke: '#4ade80', strokeWidth: 2, strokeDasharray: '6 3' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e3a5f" />
        <Controls style={{ background: '#0f2744', border: '1px solid #1e3a5f', borderRadius: 6 }} />
        <MiniMap
          nodeColor={n => ({ mcu:'#00ff9d',sensor:'#00e5ff',actuator:'#ffd700',display:'#c084fc',power:'#ef4444',passive:'#5a7a9a' }[n.data?.type as string] ?? '#00ff9d')}
          style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 6 }}
          maskColor="#0a0e1a80"
        />
        <Panel position="top-left">
          <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#5a7a9a', letterSpacing: '.1em',
            background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 4, padding: '4px 10px' }}>
            布线画布 · {nodes.length} 芯片 · {edges.length} 连线
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function WiringCanvas(props: WiringCanvasProps) {
  return <WiringCanvasInner {...props} />
}
