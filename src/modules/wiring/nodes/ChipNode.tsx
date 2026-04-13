// src/modules/wiring/nodes/ChipNode.tsx
// 支持产品图片渲染，图片加载失败自动降级为 CSS 样式节点

import { memo, useMemo, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { PinDefinition, ComponentType } from '../../../shared/types/project.schema'
import { makeHandleId, PIN_TYPE_COLORS }      from '../schema-to-flow'
import { getComponentImage }                  from '../../../shared/component-images'

const ICONS: Record<ComponentType, string> = {
  mcu:'⬡', sensor:'◈', actuator:'◉', display:'▣', power:'⚡', passive:'≋',
}
const ACCENTS: Record<ComponentType, string> = {
  mcu:'#00ff9d', sensor:'#60a5fa', actuator:'#fb923c',
  display:'#c084fc', power:'#ef4444', passive:'#9ca3af',
}

function splitPins(pins: PinDefinition[], type: ComponentType) {
  if (type === 'mcu') {
    const h = Math.ceil(pins.length / 2)
    return { left: pins.slice(0, h), right: pins.slice(h) }
  }
  const left  = pins.filter(p => p.type === 'power' || p.type === 'ground')
  const right = pins.filter(p => p.type !== 'power' && p.type !== 'ground')
  return left.length === 0 ? { left: [], right: pins } : { left, right }
}

const PinRow = memo(({ pin, componentId, side }: {
  pin: PinDefinition; componentId: string; side: 'left'|'right'
}) => {
  const color = PIN_TYPE_COLORS[pin.type] ?? '#9ca3af'
  const isL   = side === 'left'
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 24,
      flexDirection: isL ? 'row' : 'row-reverse', paddingLeft: isL ? 12 : 5, paddingRight: isL ? 5 : 12 }}>
      <Handle
        id={makeHandleId(componentId, pin.name)}
        type={isL ? 'target' : 'source'}
        position={isL ? Position.Left : Position.Right}
        style={{ width: 9, height: 9, background: color, border: `2px solid ${color}40`,
          boxShadow: `0 0 5px ${color}80`, cursor: 'crosshair' }}
      />
      <span style={{ fontSize: 7, fontFamily: '"JetBrains Mono",monospace', color,
        letterSpacing: '.04em', textAlign: isL ? 'left' : 'right',
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 3px' }}>
        {pin.name}
        {pin.gpioNum !== undefined && (
          <span style={{ color: '#4b5563', marginLeft: 2 }}>G{pin.gpioNum}</span>
        )}
      </span>
      <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, opacity: .5, flexShrink: 0 }} />
    </div>
  )
})
PinRow.displayName = 'PinRow'

export interface ChipNodeData {
  label:     string
  model:     string
  type:      ComponentType
  pins:      PinDefinition[]
  imageUrl?: string   // optional override from schema
}

export const ChipNode = memo(({ id, data, selected }: NodeProps<ChipNodeData>) => {
  const accent = ACCENTS[data.type] ?? '#4ade80'
  const { left, right } = useMemo(() => splitPins(data.pins, data.type), [data.pins, data.type])
  const rows = Math.max(left.length, right.length)

  // 图片：优先 schema 提供的 imageUrl，其次查映射表，最后降级 CSS
  const imageUrl = data.imageUrl || getComponentImage(data.model)
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = !!imageUrl && !imgFailed

  return (
    <div style={{
      width: 190, fontFamily: '"JetBrains Mono",monospace', userSelect: 'none',
      filter: selected ? `drop-shadow(0 0 14px ${accent}70)` : `drop-shadow(0 0 5px ${accent}25)`,
      transition: 'filter .2s',
    }}>
      {/* ── Header ── */}
      <div style={{
        borderRadius: '7px 7px 0 0',
        border: `1px solid ${accent}50`,
        borderBottom: showImage ? `1px solid ${accent}30` : `2px solid ${accent}`,
        overflow: 'hidden', background: '#0d1117', position: 'relative',
      }}>
        {showImage ? (
          /* 产品图片模式 */
          <div style={{ position: 'relative' }}>
            <img
              src={imageUrl!}
              alt={data.model}
              onError={() => setImgFailed(true)}
              style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block',
                borderBottom: `2px solid ${accent}` }}
            />
            {/* 图片上叠加标签 */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(6,10,15,0.92))',
              padding: '10px 8px 5px',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: '.07em',
                  textShadow: `0 0 8px ${accent}` }}>{data.label}</div>
                <div style={{ fontSize: 7, color: '#9ca3af', letterSpacing: '.05em' }}>{data.model}</div>
              </div>
              <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '.1em', color: '#0a0a0a',
                background: accent, padding: '2px 5px', borderRadius: 3 }}>
                {data.type.toUpperCase()}
              </span>
            </div>
          </div>
        ) : (
          /* CSS 降级模式 */
          <div style={{
            background: `linear-gradient(135deg,#111827,#1a2234)`,
            padding: '7px 9px 5px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0,
              backgroundImage: `linear-gradient(${accent}12 1px,transparent 1px),linear-gradient(90deg,${accent}12 1px,transparent 1px)`,
              backgroundSize: '12px 12px' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 13, color: accent }}>{ICONS[data.type]}</span>
              <div>
                <div style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: '.07em' }}>{data.label}</div>
                <div style={{ fontSize: 7, color: '#6b7280', letterSpacing: '.05em', marginTop: 1 }}>{data.model}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 6, fontWeight: 700, letterSpacing: '.1em',
                color: '#0a0a0a', background: accent, padding: '2px 4px', borderRadius: 3 }}>
                {data.type.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Pin body ── */}
      <div style={{
        background: '#0d1117', border: `1px solid ${accent}30`, borderTop: 'none',
        borderRadius: '0 0 7px 7px',
        minHeight: rows * 24 + 10,
        display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: '50%', top: 5, bottom: 5, width: 1,
          background: `linear-gradient(to bottom,transparent,${accent}20,transparent)` }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {left.map(p => <PinRow key={p.name} pin={p} componentId={id} side="left" />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {right.map(p => <PinRow key={p.name} pin={p} componentId={id} side="right" />)}
        </div>
        <div style={{ gridColumn: '1/-1', height: 2,
          background: `linear-gradient(90deg,transparent,${accent}30,transparent)`,
          borderRadius: '0 0 7px 7px' }} />
      </div>
    </div>
  )
})
ChipNode.displayName = 'ChipNode'
