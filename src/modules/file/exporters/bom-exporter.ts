// src/modules/file/exporters/bom-exporter.ts
import type { AIProjectSchema, Component } from '../../../shared/types/project.schema'

interface BOMEntry {
  comment: string
  designator: string
  footprint: string
  quantity: number
  model: string
  pins: Component['pins']
}

// Determine footprint from component model/type
function getFootprint(comp: Component): string {
  const m = comp.model.toUpperCase()
  const t = comp.type

  if (t === 'mcu') {
    if (m.includes('ESP32-WROOM-32')) return 'ESP32-WROOM-32D'
    if (m.includes('ESP32-S3')) return 'ESP32-S3'
    if (m.includes('ARDUINO UNO')) return 'Arduino UNO R3'
    if (m.includes('ARDUINO NANO')) return 'Arduino Nano'
    if (m.includes('PICO')) return 'Raspberry Pi Pico'
    return 'ESP32-Module'
  }
  if (t === 'display') {
    if (m.includes('SSD1306')) return 'OLED_0.96inch'
    if (m.includes('LCD1602')) return 'LCD1602'
    if (m.includes('ST7735')) return 'TFT1.8'
    if (m.includes('ILI9341')) return 'TFT2.4'
    return 'Display_Module'
  }
  if (t === 'sensor') {
    if (m.includes('DHT22') || m.includes('AM2302')) return 'DHT22'
    if (m.includes('DHT11')) return 'DHT11'
    if (m.includes('HC-SR04')) return 'HC-SR04'
    if (m.includes('BMP280')) return 'BMP280'
    if (m.includes('MQ-')) return `MQ${m.match(/MQ-?(\d+)/)?.[1] ?? 'Sensor'}`
    return 'Sensor_Module'
  }
  if (t === 'actuator') {
    if (m.includes('SG90') || m.includes('SERVO')) return 'SG90'
    if (m.includes('RELAY')) return 'Relay_Module'
    if (m.includes('L298N')) return 'L298N'
    if (m.includes('L293D')) return 'L293D'
    if (m.includes('WS2812') || m.includes('RGB')) return 'WS2812B'
    return 'Actuator_Module'
  }
  if (t === 'passive') {
    if (m.includes('RESISTOR') || m.includes('Ω') || m.match(/\d+k?Ω/)) {
      const val = m.match(/(\d+[kK]?)\s*Ω/)?.[1] ?? ''
      return val.includes('k') || !isNaN(Number(val)) ? `R_${val}Ω_0805` : 'R_0805'
    }
    if (m.includes('CAPACITOR') || m.includes('NF') || m.includes('UF')) {
      return 'C_0805'
    }
    return 'R_0805'
  }
  if (t === 'power') return 'Power_Module'
  return 'Generic_Module'
}

// Generate BOM CSV (JLCPCB standard format)
export function generateBOMCSV(schema: AIProjectSchema): string {
  const header = 'Comment,Designator,Footprint,Quantity\n'
  const grouped = groupByModel(schema.components)

  const rows = grouped.map(group => {
    const first = group[0]
    const comment = first.model
    const designator = group.map(c => c.label).join(',')
    const footprint = getFootprint(first)
    const quantity = group.length
    return `"${comment}","${designator}","${footprint}",${quantity}`
  })

  return header + rows.join('\n')
}

// Generate BOM JSON
export function generateBOMJSON(schema: AIProjectSchema): string {
  const grouped = groupByModel(schema.components)
  const entries: BOMEntry[] = grouped.map(group => {
    const first = group[0]
    return {
      comment: first.model,
      designator: group.map(c => c.label).join(','),
      footprint: getFootprint(first),
      quantity: group.length,
      model: first.model,
      pins: first.pins,
    }
  })

  return JSON.stringify({
    version: '1.0',
    projectName: schema.meta.name,
    generatedAt: new Date().toISOString(),
    components: entries,
  }, null, 2)
}

function groupByModel(components: Component[]): Component[][] {
  const map = new Map<string, Component[]>()
  for (const comp of components) {
    const key = comp.model
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(comp)
  }
  return Array.from(map.values())
}
