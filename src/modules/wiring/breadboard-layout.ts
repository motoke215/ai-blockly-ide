// src/modules/wiring/breadboard-layout.ts
// 面包板物理布局引擎：元器件物理封装 + 面包板轨道 + 连接线走线

import type { AIProjectSchema, Component, Connection } from '../../shared/types/project.schema'

// ── 面包板轨道规格 ──────────────────────────────────────────────────────────
// 标准 840 孔面包板：横向 63 列（A-E 5孔行 + 电源轨）
// 每个孔间距 2.54mm（标准排针间距），我们用 24px 间距便于 SVG 渲染
export const ROW_SPACING = 24   // px，插孔行间距
export const COL_SPACING = 24   // px，插孔列间距
export const CHIP_WIDTH  = 6     // 芯片占用的列数（两端各有引脚）
export const CHIP_PINS_SIDE = 20 // ESP32-DevKit 每侧 20 Pin

// ── 标准元器件物理封装定义 ──────────────────────────────────────────────────
export interface PhysicalPackage {
  pinCount:        number     // 总引脚数
  pinsPerSide:     number     // 每侧引脚数
  widthCols:       number     // 芯片占用的列数
  heightRows:      number     // 芯片占用的行数（两侧引脚间的行距）
  pinPitch:        number     // 引脚间距（默认 COL_SPACING）
  pinNames?:       string[]   // 引脚名称列表（从左上角起顺时针，用于明确映射）
  pinMap?:         (side: 'left'|'right', idx: number) => string // 引脚名称映射函数
  imageUrl?:       string     // 元器件图片URL（如果有）
}

export type PackageKey =
  | 'esp32-devkit'   // ESP32-DevKit-C3: 38Pin 双排（20+18），宽6列，高28行
  | 'esp32-s3-devkit'
  | 'uno-r3'         // Arduino UNO R3: 20Pin 双排（各10）
  | 'nano'           // Arduino Nano: 30Pin 双排（各15）
  | 'dht22'          // DHT22: 4Pin 单排，1列×4行
  | 'i2c-sensor'     // 常见 I2C 传感器模块：4Pin 单排（GND/VCC/SDA/SCL）
  | 'oled-128x64'    // OLED 显示屏：4Pin I2C
  | 'relay-module'   // 单路继电器模块：5Pin（VCC/GND/IN/NO/NC）
  | 'ultrasonic'     // 超声波传感器 HC-SR04：4Pin（TRIG/ECHO/VCC/GND）
  | 'pir'            // 人体红外传感器 HC-SR501：3Pin（OUT/VCC/GND）
  | 'sound-sensor'   // 声音传感器模块：4Pin（DO/AO/VCC/GND）
  | 'joystick'       // 双轴摇杆模块：5Pin（VRX/VRY/SW/VCC/GND）
  | 'servo'          // 舵机：3Pin（信号/电源/地）
  | 'motor-driver'   // L298N/L293D 电机驱动：8-10Pin
  | 'power-module'   // 电源模块：2Pin（输入）或 4Pin（输入+输出）
  | 'generic-dual'   // 通用双排插针模块：默认20Pin
  | 'generic-single' // 通用单排插针模块：默认4Pin
  | 'custom'

const PKG: Record<string, PhysicalPackage> = {
  'esp32-devkit':   { pinCount: 38, pinsPerSide: 20, widthCols: 6,  heightRows: 28, pinPitch: COL_SPACING },
  'esp32-s3-devkit':{ pinCount: 38, pinsPerSide: 20, widthCols: 6,  heightRows: 28, pinPitch: COL_SPACING },
  'uno-r3':         { pinCount: 20, pinsPerSide: 10, widthCols: 5,  heightRows: 18, pinPitch: COL_SPACING },
  'nano':           { pinCount: 30, pinsPerSide: 15, widthCols: 4,  heightRows: 22, pinPitch: COL_SPACING },
  'dht22':          { pinCount: 4,  pinsPerSide: 4,  widthCols: 1,  heightRows: 4,  pinPitch: ROW_SPACING },
  'i2c-sensor':     { pinCount: 4,  pinsPerSide: 4,  widthCols: 1,  heightRows: 4,  pinPitch: ROW_SPACING },
  'oled-128x64':    { pinCount: 4,  pinsPerSide: 4,  widthCols: 1,  heightRows: 4,  pinPitch: ROW_SPACING },
  'relay-module':   { pinCount: 5,  pinsPerSide: 5,  widthCols: 1,  heightRows: 5,  pinPitch: ROW_SPACING },
  'ultrasonic':     { pinCount: 4,  pinsPerSide: 4,  widthCols: 1,  heightRows: 4,  pinPitch: ROW_SPACING },
  'pir':            { pinCount: 3,  pinsPerSide: 3,  widthCols: 1,  heightRows: 3,  pinPitch: ROW_SPACING },
  'sound-sensor':   { pinCount: 4,  pinsPerSide: 4,  widthCols: 1,  heightRows: 4,  pinPitch: ROW_SPACING },
  'joystick':       { pinCount: 5,  pinsPerSide: 5,  widthCols: 1,  heightRows: 5,  pinPitch: ROW_SPACING },
  'servo':          { pinCount: 3,  pinsPerSide: 3,  widthCols: 1,  heightRows: 3,  pinPitch: ROW_SPACING },
  'motor-driver':   { pinCount: 10, pinsPerSide: 5,  widthCols: 2,  heightRows: 10, pinPitch: COL_SPACING },
  'power-module':   { pinCount: 4,  pinsPerSide: 2,  widthCols: 2,  heightRows: 4,  pinPitch: COL_SPACING },
  'generic-dual':   { pinCount: 20, pinsPerSide: 10, widthCols: 5,  heightRows: 14, pinPitch: COL_SPACING },
  'generic-single': { pinCount: 4,  pinsPerSide: 4,  widthCols: 1,  heightRows: 4,  pinPitch: ROW_SPACING },
  'custom':         { pinCount: 8,  pinsPerSide: 4,  widthCols: 2,  heightRows: 6,  pinPitch: COL_SPACING },
}

export function getPackage(key: string): PhysicalPackage {
  return PKG[key] ?? PKG['generic-dual']
}

// ── 元器件自动分类检测 ──────────────────────────────────────────────────────
function detectPackageType(comp: Component): PackageKey {
  const model = comp.model.toLowerCase()
  const label = comp.label.toLowerCase()
  const pinCount = comp.pins.length

  if (/esp32[- ]c3|esp32[- ]devkit|esp32[- ]wroom|esp32[- ]mini/i.test(model + label))
    return 'esp32-devkit'
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

  // 按引脚数推断
  if (pinCount >= 30) return 'generic-dual'
  if (pinCount >= 10) return 'generic-dual'
  if (pinCount <= 6)  return 'generic-single'
  return 'generic-dual'
}

// ── 面包板可渲染元素 ────────────────────────────────────────────────────────
export type BreadboardElement =
  | { kind: 'chip';       id: string; x: number; y: number; w: number; h: number; label: string; model: string; type: string; pinCount: number; imageUrl?: string }
  | { kind: 'wire';      id: string; points: [number,number][]; color: string; width: number; label?: string }
  | { kind: 'pin-dot';   id: string; x: number; y: number; pinName: string; gpioNum?: number }
  | { kind: 'net-label';  id: string; x: number; y: number; text: string; color: string }
  | { kind: 'track-h';   id: string; x: number; y: number; length: number; color: string } // 面包板横向轨道
  | { kind: 'track-v';   id: string; x: number; y: number; length: number; color: string } // 面包板纵向轨道

const WIRE_COLOR_MAP: Record<string, string> = {
  red:'#ef4444', black:'#6b7280', yellow:'#fbbf24', blue:'#60a5fa',
  orange:'#fb923c', green:'#4ade80', white:'#e5e7eb', purple:'#c084fc',
}

function getWireColor(conn: Connection): string {
  if (conn.wireColor && WIRE_COLOR_MAP[conn.wireColor]) return WIRE_COLOR_MAP[conn.wireColor]
  const p = conn.source.pinName.toUpperCase()
  if (['VCC','3V3','5V'].includes(p)) return '#ef4444'
  if (p === 'GND') return '#6b7280'
  if (p.includes('SDA')) return '#60a5fa'
  if (p.includes('SCL')) return '#fb923c'
  if (p.includes('TX')) return '#4ade80'
  if (p.includes('RX')) return '#f472b6'
  return '#fbbf24'
}

// ── 主布局算法 ──────────────────────────────────────────────────────────────
// 面包板尺寸：标准全尺寸
const BOARD_COLS = 63    // 横向 63 列插孔
const BOARD_ROWS = 40    // 纵向 40 行（主区域 A-E + 上方电源轨 + 下方电源轨）
const TRACK_HEIGHT = 4   // 电源轨高度（行数）
const MARGIN_X = 3       // 左边距（跳过电源轨区域）
const MARGIN_TOP = 5      // 上边距

// 分配给每个芯片的网格区域
interface ChipPlacement {
  comp: Component
  pkg: PhysicalPackage
  originCol: number  // 芯片最左端所在列
  originRow: number  // 芯片最上端所在行
}

function autoPlace(chips: ChipPlacement[]): ChipPlacement[] {
  // 简单网格布局：按行排列，每行放尽量多的芯片
  const result: ChipPlacement[] = []
  let curCol = MARGIN_X
  let curRow = MARGIN_TOP + TRACK_HEIGHT
  let rowMaxHeight = 0
  const maxCols = BOARD_COLS - MARGIN_X - 5

  for (const chip of chips) {
    const chipW = chip.pkg.widthCols + 4 // 两端各留 2 列间距
    if (curCol + chipW > maxCols) {
      // 换行
      curCol = MARGIN_X
      curRow += rowMaxHeight + 8
      rowMaxHeight = 0
    }
    result.push({ ...chip, originCol: curCol, originRow: curRow })
    curCol += chipW + 2
    rowMaxHeight = Math.max(rowMaxHeight, chip.pkg.heightRows)
  }
  return result
}

// ── 物理引脚坐标计算 ────────────────────────────────────────────────────────
function pinPosition(placement: ChipPlacement, side: 'left'|'right', pinIdx: number): { x: number; y: number } {
  const { pkg, originCol, originRow } = placement
  const pitch = pkg.pinPitch ?? COL_SPACING

  if (side === 'left') {
    // 左侧引脚：从上到下
    return {
      x: (originCol - 2) * COL_SPACING,
      y: (originRow + pinIdx) * pitch,
    }
  } else {
    // 右侧引脚：从上到下（镜像）
    const rightOffset = (pkg.widthCols + 4) * COL_SPACING
    return {
      x: (originCol + rightOffset / COL_SPACING) * COL_SPACING,
      y: (originRow + pinIdx) * pitch,
    }
  }
}

// ── 连接到面包板网络 ────────────────────────────────────────────────────────
// 电源轨网络：VCC（红轨）、GND（蓝轨）
const VCC_NET = ['VCC','3V3','5V']
const GND_NET = ['GND']

function buildNetMap(schema: AIProjectSchema): Map<string, { x: number; y: number; net: string }> {
  const netMap = new Map<string, { x: number; y: number; net: string }>()

  // 电源轨位置（左侧）
  const vccTrackX = (MARGIN_X - 1) * COL_SPACING
  const gndTrackX = (MARGIN_X - 2) * COL_SPACING
  for (let row = 0; row < BOARD_ROWS; row++) {
    netMap.set(`__vcc_${row}`, { x: vccTrackX, y: row * ROW_SPACING, net: 'VCC' })
    netMap.set(`__gnd_${row}`, { x: gndTrackX, y: row * ROW_SPACING, net: 'GND' })
  }
  return netMap
}

// ── 完整布局生成 ────────────────────────────────────────────────────────────
export interface BreadboardLayout {
  elements: BreadboardElement[]
  viewWidth: number   // 画布总宽度
  viewHeight: number  // 画布总高度
  mcuPlacement?: ChipPlacement  // MCU 位置（用于参考）
}

export function buildBreadboardLayout(schema: AIProjectSchema): BreadboardLayout {
  const elements: BreadboardElement[] = []
  const placements: ChipPlacement[] = []

  // 1. 找到 MCU（主芯片）并优先放置
  const mcuComp = schema.components.find(c => c.type === 'mcu')
  const otherComps = schema.components.filter(c => c.type !== 'mcu')

  // 2. 为每个芯片计算封装
  const allPlacements = [...schema.components].map(comp => {
    const pkgKey = detectPackageType(comp)
    const pkg = getPackage(pkgKey)
    return { comp, pkg, originCol: 0, originRow: 0 } as ChipPlacement
  })

  // 3. 排序：MCU 放中间，其他围绕
  const sorted = allPlacements.sort((a, b) => {
    if (a.comp.type === 'mcu' && b.comp.type !== 'mcu') return -1
    if (b.comp.type === 'mcu' && a.comp.type !== 'mcu') return 1
    return 0
  })

  // 4. 自动布局
  const placed = autoPlace(sorted)
  placed.forEach(p => placements.push(p))

  // 5. 生成芯片元素
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

    // 生成引脚坐标点
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

  // 6. 生成面包板轨道（背景网格）
  const totalCols = BOARD_COLS
  const totalRows = BOARD_ROWS

  // 左侧电源轨（红+ / 蓝-）
  for (let row = 0; row < totalRows; row++) {
    const y = row * ROW_SPACING
    elements.push({ kind: 'track-h', id: `__vcc_track_${row}`, x: 0, y, length: 3 * COL_SPACING, color: '#ef444440' })
    elements.push({ kind: 'track-h', id: `__gnd_track_${row}`, x: 0, y: y + ROW_SPACING * 0.6, length: 3 * COL_SPACING, color: '#6b728040' })
  }

  // 主区域插孔列（每列5个插孔 A-E）
  for (let col = MARGIN_X; col < totalCols - 2; col++) {
    for (let row = 0; row < totalRows - 1; row++) {
      const x = col * COL_SPACING
      const y = row * ROW_SPACING
      // 插孔中心点（5孔行）
      elements.push({ kind: 'pin-dot', id: `__hole_${col}_${row}`, x, y, pinName: '' })
    }
  }

  // 7. 生成导线
  const usedNets = new Map<string, { x: number; y: number }>()

  for (const conn of schema.connections) {
    const color = getWireColor(conn)

    // 找到源引脚和目标引脚坐标
    const srcComp = schema.components.find(c => c.id === conn.source.componentId)
    const tgtComp = schema.components.find(c => c.id === conn.target.componentId)
    if (!srcComp || !tgtComp) continue

    // 在 placements 中查找坐标
    const srcPlaced = placements.find(p => p.comp.id === conn.source.componentId)
    const tgtPlaced = placements.find(p => p.comp.id === conn.target.componentId)
    if (!srcPlaced || !tgtPlaced) continue

    // 计算源引脚位置
    const srcPkg = srcPlaced.pkg
    const srcPinIdx = srcComp.pins.findIndex(p => p.name === conn.source.pinName)
    const srcLeftCount = Math.ceil(srcPkg.pinCount / 2)
    const srcSide: 'left'|'right' = srcPinIdx < srcLeftCount ? 'left' : 'right'
    const srcLocalIdx = srcSide === 'left' ? srcPinIdx : srcPinIdx - srcLeftCount
    const srcPos = pinPosition(srcPlaced, srcSide, srcLocalIdx)

    // 计算目标引脚位置
    const tgtPkg = tgtPlaced.pkg
    const tgtPinIdx = tgtComp.pins.findIndex(p => p.name === conn.target.pinName)
    const tgtLeftCount = Math.ceil(tgtPkg.pinCount / 2)
    const tgtSide: 'left'|'right' = tgtPinIdx < tgtLeftCount ? 'left' : 'right'
    const tgtLocalIdx = tgtSide === 'left' ? tgtPinIdx : tgtPinIdx - tgtLeftCount
    const tgtPos = pinPosition(tgtPlaced, tgtSide, tgtLocalIdx)

    // 生成走线（带拐点的折线，模拟面包板布线）
    const midX = (srcPos.x + tgtPos.x) / 2
    const points: [number,number][] = [
      [srcPos.x, srcPos.y],
      [srcPos.x + (srcSide === 'left' ? -20 : 20), srcPos.y],       // 水平出线
      [srcSide === 'left' ? midX - 40 : midX + 40, srcPos.y],        // 水平中段
      [tgtSide === 'left' ? midX - 40 : midX + 40, tgtPos.y],       // 垂直到目标行
      [tgtPos.x + (tgtSide === 'left' ? -20 : 20), tgtPos.y],      // 水平进线
      [tgtPos.x, tgtPos.y],
    ]

    elements.push({
      kind: 'wire',
      id: conn.id,
      points,
      color,
      width: 2,
      label: conn.source.pinName,
    })
  }

  // 8. 画布尺寸
  const viewWidth  = (BOARD_COLS + 10) * COL_SPACING
  const viewHeight = (BOARD_ROWS + 2) * ROW_SPACING

  return { elements, viewWidth, viewHeight, mcuPlacement: placements.find(p => p.comp.type === 'mcu') }
}
