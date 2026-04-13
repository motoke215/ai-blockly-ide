// src/modules/file/exporters/kicad-exporter.ts
// 生成 KiCad 6 原理图 (.kicad_sch) S-expression 格式
// JLCPCB 直接接受 KiCad 项目 zip
import type { AIProjectSchema } from '../../../shared/types/project.schema'

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function pinToKiCadType(type: string): string {
  const map: Record<string, string> = {
    power:     'power_in',
    ground:    'power_in',
    digital:   'bidirectional',
    analog:    'input',
    i2c_sda:   'bidirectional',
    i2c_scl:   'bidirectional',
    spi_mosi:  'output',
    spi_miso:  'input',
    spi_clk:   'output',
    uart_tx:   'output',
    uart_rx:   'input',
  }
  return map[type] ?? 'passive'
}

function pinToKiCadDirection(type: string): string {
  const map: Record<string, string> = {
    power:     'L',
    ground:     'L',
    digital:   'B',
    analog:    'I',
    i2c_sda:   'B',
    i2c_scl:   'B',
    spi_mosi:  'O',
    spi_miso:  'I',
    spi_clk:   'O',
    uart_tx:   'O',
    uart_rx:   'I',
  }
  return map[type] ?? 'P'
}

export function generateKiCadSchematic(schema: AIProjectSchema): string {
  const projectUuid = uuidv4()
  const sheetUuid  = uuidv4()

  // Layout: 3-column grid
  const COMP_COLS = 3
  const COMP_SPACING_X = 200
  const COMP_SPACING_Y = 150
  const GRID_ORIGIN_X = 100
  const GRID_ORIGIN_Y = 100

  const positions = new Map<string, { x: number; y: number }>()
  schema.components.forEach((comp, idx) => {
    if (comp.position) {
      positions.set(comp.id, comp.position)
    } else {
      const col = idx % COMP_COLS
      const row = Math.floor(idx / COMP_COLS)
      positions.set(comp.id, {
        x: GRID_ORIGIN_X + col * COMP_SPACING_X,
        y: GRID_ORIGIN_Y + row * COMP_SPACING_Y,
      })
    }
  })

  // Generate symbol instances
  const symbols = schema.components.map(comp => {
    const uuid     = uuidv4()
    const pos      = positions.get(comp.id) ?? { x: 0, y: 0 }
    const pinDefs  = comp.pins.map((pin, pIdx) => {
      const pinUuid = uuidv4()
      // Pin position on the symbol box (4 sides)
      const pinCount = comp.pins.length
      const pinPerSide = Math.ceil(pinCount / 4)
      const sideIdx = Math.floor(pIdx / pinPerSide)
      const posInSide = pIdx % pinPerSide
      const sideLen = 80 // height of symbol
      const frac = pinPerSide > 1 ? posInSide / (pinPerSide - 1) : 0.5
      let px = 0, py = 0
      if (sideIdx === 0) { px = 0; py = 10 + frac * sideLen }         // left
      else if (sideIdx === 1) { px = 100; py = 10 + frac * sideLen }  // right
      else if (sideIdx === 2) { px = frac * 100; py = 0 }              // top
      else { px = frac * 100; py = 100 }                              // bottom
      return `      (pin ${pin.name} (uuid "${pinUuid}") (type ${pinToKiCadType(pin.type)})
        (pin circuit net name: (property (name "net_name") (id 2) (type "string"))
        (position ${px.toFixed(2)} ${py.toFixed(2)}) (rotation 0.0) (font (size 1.27 1.27))))`
    }).join('\n')

    return `    (symbol (uuid "${uuid}")
      (lib_id "ai-blockly:${comp.type}")
      (at ${pos.x.toFixed(0)} ${pos.y.toFixed(0)} 0)
      (unit 1)
      (status 0)
      (property (name "Reference") (id 0) (value "${comp.label}") (properties (font (size 1.27 1.27))))
      (property (name "Value") (id 1) (value "${comp.model}") (properties (font (size 1.27 1.27))))
      (property (name "Footprint") (id 2) (value "") (properties (font (size 1.27 1.27))))
      (property (name "Datasheet") (id 3) (value "") (properties (font (size 1.27 1.27))))
      ${pinDefs}
    )`
  }).join('\n')

  // Generate wire connections
  const wires = schema.connections.map(conn => {
    const wireUuid = uuidv4()
    const srcPos = positions.get(conn.source.componentId)
    const tgtPos = positions.get(conn.target.componentId)
    if (!srcPos || !tgtPos) return ''

    const srcPinIdx = schema.components.find(c => c.id === conn.source.componentId)?.pins.findIndex(p => p.name === conn.source.pinName) ?? 0
    const tgtPinIdx = schema.components.find(c => c.id === conn.target.componentId)?.pins.findIndex(p => p.name === conn.target.pinName) ?? 0

    const srcPerSide = Math.ceil(schema.components.find(c => c.id === conn.source.componentId)!.pins.length / 4)
    const srcSideIdx = Math.floor(srcPinIdx / srcPerSide)
    const srcFrac = srcPerSide > 1 ? (srcPinIdx % srcPerSide) / (srcPerSide - 1) : 0.5
    const tgtPerSide = Math.ceil(schema.components.find(c => c.id === conn.target.componentId)!.pins.length / 4)
    const tgtSideIdx = Math.floor(tgtPinIdx / tgtPerSide)
    const tgtFrac = tgtPerSide > 1 ? (tgtPinIdx % tgtPerSide) / (tgtPerSide - 1) : 0.5

    const sx = srcSideIdx === 0 ? 0 : srcSideIdx === 1 ? 100 : srcFrac * 100
    const sy = srcSideIdx === 0 || srcSideIdx === 1 ? 10 + srcFrac * 80 : 0
    const tx = tgtSideIdx === 0 ? 0 : tgtSideIdx === 1 ? 100 : tgtFrac * 100
    const ty = tgtSideIdx === 0 || tgtSideIdx === 1 ? 10 + tgtFrac * 80 : 0

    const x1 = (srcPos.x + sx).toFixed(0)
    const y1 = (srcPos.y + sy).toFixed(0)
    const x2 = (tgtPos.x + tx).toFixed(0)
    const y2 = (tgtPos.y + ty).toFixed(0)

    return `    (wire (uuid "${wireUuid}") (net "${conn.source.pinName}")
      (path (uuid "${uuidv4()}") (layer "Schematic") (tstamp "${uuidv4()}"))
      (stroke (width 0) (type default))
      (uuid "${wireUuid}")
      (start (pt ${x1} ${y1}) (end (pt ${x2} ${y2}))
        (stroke (width 0) (type default)))
    )`
  }).filter(Boolean).join('\n')

  return `(kicad_sch (version 20231120) (generator "ai-blockly-ide")
  (uuid "${projectUuid}")
  (paper "A4")
  (title_block
    (title "${schema.meta.name}")
    (company "AI-Blockly-IDE")
    (rev "1.0")
    (date "${new Date().toISOString().slice(0, 10)}")
  )
  (lib_symbols
    ${symbols}
  )
  (sheet (uuid "${sheetUuid}") (name "Main") (page "A4")
    (components
    ${schema.components.map(c => {
      const pos = positions.get(c.id)!
      return `(comp (ref "${c.label}") (uuid "${uuidv4()}"))`
    }).join('\n    ')}
    )
    (sheet_instances
      (path "/" (page "A4"))
    )
  )
  ${wires}
)`
}

export function generateKiCadProjectDir(schema: AIProjectSchema): Record<string, string> {
  const sketchName = schema.meta.name.replace(/\s+/g, '_')
  return {
    [`${sketchName}.kicad_sch`]: generateKiCadSchematic(schema),
    [`${sketchName}.kicad_pcb`]: generateKiCadPCB(schema),
    [`${sketchName}.kicad_pro`]: generateKiCadPro(schema),
    'sym-lib-table': '',
  }
}

function generateKiCadPCB(schema: AIProjectSchema): string {
  const projectUuid = uuidv4()
  return `(kicad_pcb (version 20231120) (generator "ai-blockly-ide")
  (uuid "${projectUuid}")
  (general
    (thickness 1.6)
    (layers 2)
  )
  (paper "A4")
)`
}

function generateKiCadPro(schema: AIProjectSchema): string {
  const projectUuid = uuidv4()
  return `(kicad_pro (version 20231120) (generator "ai-blockly-ide")
  (uuid "${projectUuid}")
  (metadata
    (name "${schema.meta.name}")
  )
)`
}
