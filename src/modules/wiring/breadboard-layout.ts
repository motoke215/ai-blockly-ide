// src/modules/wiring/breadboard-layout.ts
// 面包板物理布局引擎：元器件物理封装 + 面包板轨道 + 连接线走线

import type { AIProjectSchema, Component, Connection } from '../../shared/types/project.schema'

export const ROW_SPACING = 24
export const COL_SPACING = 24

export interface PhysicalPackage {
  pinCount: number
  pinsPerSide: number
  widthCols: number
  heightRows: number
  pinPitch: number
  imageUrl?: string
}

export type PackageKey =
  | 'esp32-devkit'
  | 'esp32-s3-devkit'
  | 'uno-r3'
  | 'nano'
  | 'dht22'
  | 'i2c-sensor'
  | 'oled-128x64'
  | 'relay-module'
  | 'ultrasonic'
  | 'pir'
  | 'sound-sensor'
  | 'joystick'
  | 'servo'
  | 'motor-driver'
  | 'power-module'
  | 'generic-dual'
  | 'generic-single'
  | 'custom'

const PKG: Record<string, PhysicalPackage> = {
  'esp32-devkit': { pinCount: 38, pinsPerSide: 20, widthCols: 6, heightRows: 28, pinPitch: COL_SPACING },
  'esp32-s3-devkit': { pinCount: 38, pinsPerSide: 20, widthCols: 6, heightRows: 28, pinPitch: COL_SPACING },
  'uno-r3': { pinCount: 20, pinsPerSide: 10, widthCols: 5, heightRows: 18, pinPitch: COL_SPACING },
  'nano': { pinCount: 30, pinsPerSide: 15, widthCols: 4, heightRows: 22, pinPitch: COL_SPACING },
  'dht22': { pinCount: 4, pinsPerSide: 4, widthCols: 1, heightRows: 4, pinPitch: ROW_SPACING },
  'i2c-sensor': { pinCount: 4, pinsPerSide: 4, widthCols: 1, heightRows: 4, pinPitch: ROW_SPACING },
  'oled-128x64': { pinCount: 4, pinsPerSide: 4, widthCols: 1, heightRows: 4, pinPitch: ROW_SPACING },
  'relay-module': { pinCount: 5, pinsPerSide: 5, widthCols: 1, heightRows: 5, pinPitch: ROW_SPACING },
  'ultrasonic': { pinCount: 4, pinsPerSide: 4, widthCols: 1, heightRows: 4, pinPitch: ROW_SPACING },
  'pir': { pinCount: 3, pinsPerSide: 3, widthCols: 1, heightRows: 3, pinPitch: ROW_SPACING },
  'sound-sensor': { pinCount: 4, pinsPerSide: 4, widthCols: 1, heightRows: 4, pinPitch: ROW_SPACING },
  'joystick': { pinCount: 5, pinsPerSide: 5, widthCols: 1, heightRows: 5, pinPitch: ROW_SPACING },
  'servo': { pinCount: 3, pinsPerSide: 3, widthCols: 1, heightRows: 3, pinPitch: ROW_SPACING },
  'motor-driver': { pinCount: 10, pinsPerSide: 5, widthCols: 2, heightRows: 10, pinPitch: COL_SPACING },
  'power-module': { pinCount: 4, pinsPerSide: 2, widthCols: 2, heightRows: 4, pinPitch: COL_SPACING },
  'generic-dual': { pinCount: 20, pinsPerSide: 10, widthCols: 5, heightRows: 14, pinPitch: COL_SPACING },
  'generic-single': { pinCount: 4, pinsPerSide: 4, widthCols: 1, heightRows: 4, pinPitch: ROW_SPACING },
  'custom': { pinCount: 8, pinsPerSide: 4, widthCols: 2, heightRows: 6, pinPitch: COL_SPACING },
}

export function getPackage(key: string): PhysicalPackage {
  return PKG[key] ?? PKG['generic-dual']
}

function detectPackageType(comp: Component): PackageKey {
  const model = comp.model.toLowerCase()
  const label = comp.label.toLowerCase()
  const pinCount = comp.pins.length

  if (/esp32[- ]c3|esp32[- ]devkit|esp32[- ]wroom|esp32[- ]mini/i.test(model + label)) return 'esp32-devkit'
  if (/uno|arduino.*uno/i.test(model + label)) return 'uno-r3'
  if (/nano|arduino.*nano/i.test(model + label)) return 'nano'
  if (/dht/i.test(model + label)) return 'dht22'
  if (/oled|ssd1306|i2c.*display/i.test(model + label)) return 'oled-128x64'
  if (/relay/i.test(model + label)) return 'relay-module'
  if (/hc[- ]sr04|ultrasonic/i.test(model + label)) return 'ultrasonic'
  if (/hc[- ]sr501|pir|motion/i.test(model + label)) return 'pir'
  if (/sound|audio|mic/i.test(model + label)) return 'sound-sensor'
  if (/joystick|game.*pad/i.test(model + label)) return 'joystick'
  if (/servo|motor.*driver|l298|l293/i.test(model + label)) return 'motor-driver'
  if (/power|dc[- ]dc|buck|boost/i.test(model + label)) return 'power-module'

  if (pinCount >= 10) return 'generic-dual'
  if (pinCount <= 6) return 'generic-single'
  return 'generic-dual'
}

export type BreadboardElement =
  | { kind: 'chip'; id: string; x: number; y: number; w: number; h: number; label: string; model: string; type: string; pinCount: number }
  | { kind: 'wire'; id: string; points: [number, number][]; color: string; width: number; label?: string; bus?: boolean }
  | { kind: 'pin-dot'; id: string; x: number; y: number; pinName: string; gpioNum?: number }
  | { kind: 'track-h'; id: string; x: number; y: number; length: number; color: string }

const WIRE_COLOR_MAP: Record<string, string> = {
  red: '#ef4444', black: '#6b7280', yellow: '#fbbf24', blue: '#60a5fa',
  orange: '#fb923c', green: '#4ade80', white: '#e5e7eb', purple: '#c084fc',
}

function getWireColor(conn: Connection): string {
  if (conn.wireColor && WIRE_COLOR_MAP[conn.wireColor]) return WIRE_COLOR_MAP[conn.wireColor]
  const p = conn.source.pinName.toUpperCase()
  if (['VCC', '3V3', '5V'].includes(p)) return '#ef4444'
  if (p === 'GND') return '#6b7280'
  if (p.includes('SDA')) return '#60a5fa'
  if (p.includes('SCL')) return '#fb923c'
  if (p.includes('TX')) return '#4ade80'
  if (p.includes('RX')) return '#f472b6'
  return '#fbbf24'
}

const BOARD_COLS = 63
const BOARD_ROWS = 40
const TRACK_HEIGHT = 4
const MARGIN_X = 3
const MARGIN_TOP = 5
const POWER_RAIL_X = 1 * COL_SPACING
const GND_RAIL_X = 3.8 * COL_SPACING
const SDA_BUS_X = 12 * COL_SPACING
const SCL_BUS_X = 15 * COL_SPACING
const SIGNAL_LANE_X = 20 * COL_SPACING

interface ChipPlacement {
  comp: Component
  pkg: PhysicalPackage
  originCol: number
  originRow: number
}

function groupRank(comp: Component) {
  if (comp.type === 'mcu') return 0
  if (comp.type === 'power') return 1
  if (comp.type === 'sensor') return 2
  if (comp.type === 'display') return 3
  if (comp.type === 'actuator') return 4
  return 5
}

function autoPlace(chips: ChipPlacement[]): ChipPlacement[] {
  const result: ChipPlacement[] = []
  const sorted = [...chips].sort((a, b) => groupRank(a.comp) - groupRank(b.comp))
  let curCol = MARGIN_X + 8
  let curRow = MARGIN_TOP + TRACK_HEIGHT
  let rowMaxHeight = 0
  const maxCols = BOARD_COLS - MARGIN_X - 5

  for (const chip of sorted) {
    const chipW = chip.pkg.widthCols + 4
    if (curCol + chipW > maxCols) {
      curCol = MARGIN_X + 8
      curRow += rowMaxHeight + 8
      rowMaxHeight = 0
    }
    result.push({ ...chip, originCol: curCol, originRow: curRow })
    curCol += chipW + 4
    rowMaxHeight = Math.max(rowMaxHeight, chip.pkg.heightRows)
  }
  return result
}

function pinPosition(placement: ChipPlacement, side: 'left' | 'right', pinIdx: number): { x: number; y: number } {
  const { pkg, originCol, originRow } = placement
  const pitch = pkg.pinPitch ?? COL_SPACING
  if (side === 'left') {
    return { x: (originCol - 2) * COL_SPACING, y: (originRow + pinIdx) * pitch }
  }
  const rightOffset = (pkg.widthCols + 4) * COL_SPACING
  return { x: (originCol + rightOffset / COL_SPACING) * COL_SPACING, y: (originRow + pinIdx) * pitch }
}

export interface BreadboardLayout {
  elements: BreadboardElement[]
  viewWidth: number
  viewHeight: number
  mcuPlacement?: ChipPlacement
}

export function buildBreadboardLayout(schema: AIProjectSchema): BreadboardLayout {
  const elements: BreadboardElement[] = []
  const placements = autoPlace(schema.components.map(comp => ({ comp, pkg: getPackage(detectPackageType(comp)), originCol: 0, originRow: 0 })))

  for (const p of placements) {
    const { comp, pkg, originCol, originRow } = p
    elements.push({
      kind: 'chip',
      id: comp.id,
      x: originCol * COL_SPACING,
      y: originRow * ROW_SPACING,
      w: (pkg.widthCols + 4) * COL_SPACING,
      h: (pkg.heightRows + 1) * ROW_SPACING,
      label: comp.label,
      model: comp.model,
      type: comp.type,
      pinCount: comp.pins.length,
    })

    const leftCount = Math.ceil(pkg.pinCount / 2)
    const rightCount = Math.floor(pkg.pinCount / 2)
    for (let i = 0; i < leftCount; i++) {
      const pos = pinPosition(p, 'left', i)
      const pinName = comp.pins[i]?.name ?? `P${i}`
      const gpioNum = comp.pins[i]?.gpioNum
      elements.push({ kind: 'pin-dot', id: `${comp.id}__pin_l${i}`, x: pos.x, y: pos.y, pinName, gpioNum })
    }
    for (let i = 0; i < rightCount; i++) {
      const pos = pinPosition(p, 'right', i)
      const pinName = comp.pins[leftCount + i]?.name ?? `P${leftCount + i}`
      const gpioNum = comp.pins[leftCount + i]?.gpioNum
      elements.push({ kind: 'pin-dot', id: `${comp.id}__pin_r${i}`, x: pos.x, y: pos.y, pinName, gpioNum })
    }
  }

  for (let row = 0; row < BOARD_ROWS; row++) {
    const y = row * ROW_SPACING
    elements.push({ kind: 'track-h', id: `__vcc_track_${row}`, x: 0, y, length: 3 * COL_SPACING, color: '#ef444440' })
    elements.push({ kind: 'track-h', id: `__gnd_track_${row}`, x: 0, y: y + ROW_SPACING * 0.6, length: 3 * COL_SPACING, color: '#6b728040' })
  }

  for (let col = MARGIN_X; col < BOARD_COLS - 2; col++) {
    for (let row = 0; row < BOARD_ROWS - 1; row++) {
      elements.push({ kind: 'pin-dot', id: `__hole_${col}_${row}`, x: col * COL_SPACING, y: row * ROW_SPACING, pinName: '' })
    }
  }

  const laneIndex = new Map<string, number>()
  const nextLane = (group: string) => {
    const current = laneIndex.get(group) ?? 0
    laneIndex.set(group, current + 1)
    return current
  }

  for (const conn of schema.connections) {
    const color = getWireColor(conn)
    const srcComp = schema.components.find(c => c.id === conn.source.componentId)
    const tgtComp = schema.components.find(c => c.id === conn.target.componentId)
    if (!srcComp || !tgtComp) continue

    const srcPlaced = placements.find(p => p.comp.id === conn.source.componentId)
    const tgtPlaced = placements.find(p => p.comp.id === conn.target.componentId)
    if (!srcPlaced || !tgtPlaced) continue

    const srcPinIdx = srcComp.pins.findIndex(p => p.name === conn.source.pinName)
    const tgtPinIdx = tgtComp.pins.findIndex(p => p.name === conn.target.pinName)
    if (srcPinIdx < 0 || tgtPinIdx < 0) continue

    const srcLeftCount = Math.ceil(srcPlaced.pkg.pinCount / 2)
    const tgtLeftCount = Math.ceil(tgtPlaced.pkg.pinCount / 2)
    const srcSide: 'left' | 'right' = srcPinIdx < srcLeftCount ? 'left' : 'right'
    const tgtSide: 'left' | 'right' = tgtPinIdx < tgtLeftCount ? 'left' : 'right'
    const srcPos = pinPosition(srcPlaced, srcSide, srcSide === 'left' ? srcPinIdx : srcPinIdx - srcLeftCount)
    const tgtPos = pinPosition(tgtPlaced, tgtSide, tgtSide === 'left' ? tgtPinIdx : tgtPinIdx - tgtLeftCount)

    const upper = conn.source.pinName.toUpperCase()
    const group = upper.includes('GND') ? 'gnd'
      : /VCC|3V3|5V/i.test(upper) ? 'power'
      : upper.includes('SDA') ? 'sda'
      : upper.includes('SCL') ? 'scl'
      : 'signal'

    const lane = nextLane(group)
    const laneX = group === 'power' ? POWER_RAIL_X
      : group === 'gnd' ? GND_RAIL_X
      : group === 'sda' ? SDA_BUS_X
      : group === 'scl' ? SCL_BUS_X
      : SIGNAL_LANE_X + lane * COL_SPACING * 0.8

    const points: [number, number][] = [
      [srcPos.x, srcPos.y],
      [laneX, srcPos.y],
      [laneX, tgtPos.y],
      [tgtPos.x, tgtPos.y],
    ]

    elements.push({
      kind: 'wire',
      id: conn.id,
      points,
      color,
      width: group === 'power' || group === 'gnd' ? 2.6 : 2,
      label: conn.source.pinName,
      bus: group !== 'signal',
    })
  }

  const viewWidth = (BOARD_COLS + 10) * COL_SPACING
  const viewHeight = (BOARD_ROWS + 2) * ROW_SPACING

  return {
    elements,
    viewWidth,
    viewHeight,
    mcuPlacement: placements.find(p => p.comp.type === 'mcu'),
  }
}
