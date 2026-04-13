// src/modules/file/importers/component-importer.ts
// 解析 JSON / CSV 格式的元件清单
import type { AIProjectSchema } from '../../../shared/types/project.schema'

export function parseComponentListJSON(content: string): AIProjectSchema {
  const data = JSON.parse(content) as AIProjectSchema
  if (!data.meta || !Array.isArray(data.components)) {
    throw new Error('JSON 缺少 meta 或 components 字段')
  }
  return data
}

export function parseComponentListCSV(content: string): AIProjectSchema {
  const lines = content.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV 至少需要表头和一行数据')

  // Parse header: Comment,Designator,Footprint,Quantity
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const commentIdx = header.findIndex(h => h.toLowerCase().includes('comment') || h.toLowerCase().includes('型号'))
  const designatorIdx = header.findIndex(h => h.toLowerCase().includes('designator') || h.toLowerCase().includes('标号'))
  const footprintIdx = header.findIndex(h => h.toLowerCase().includes('footprint') || h.toLowerCase().includes('封装'))

  if (commentIdx === -1) throw new Error('CSV 缺少 Comment/型号 列')

  const components: AIProjectSchema['components'] = []
  let idx = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const comment = cols[commentIdx] ?? ''
    const designator = cols[designatorIdx] ?? `U${idx}`
    const footprint = cols[footprintIdx] ?? ''

    if (!comment) continue

    const model = comment
    const type = inferComponentType(model, footprint)
    const label = designator || `Component${idx + 1}`

    components.push({
      id: `comp_${type}_${idx}`,
      type,
      label,
      model,
      pins: [],
    })
    idx++
  }

  return {
    meta: {
      id: `imported-${Date.now()}`,
      name: 'Imported Component List',
      description: `从 CSV 导入，共 ${components.length} 个元件`,
      targetBoard: 'esp32',
    },
    components,
    connections: [],
    blocklyWorkspace: [],
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function inferComponentType(model: string, footprint: string): AIProjectSchema['components'][0]['type'] {
  const m = model.toLowerCase()
  const f = footprint.toLowerCase()
  if (m.includes('esp32') || m.includes('arduino') || m.includes('raspberry') || m.includes('mcu') || m.includes('芯片')) return 'mcu'
  if (m.includes('led') || m.includes('rgb') || m.includes('ws2812') || m.includes('buzzer') || m.includes('relay') || m.includes('motor') || m.includes('servo') || m.includes('fan') || m.includes('pump')) return 'actuator'
  if (m.includes('lcd') || m.includes('oled') || m.includes('tft') || m.includes('display') || m.includes('screen')) return 'display'
  if (m.includes('resistor') || m.includes('capacitor') || m.includes('inductor') || m.includes('crystal')) return 'passive'
  if (m.includes('sensor') || m.includes('dht') || m.includes('hc-sr') || m.includes('pir') || m.includes('mq-') || m.includes('ldr') || m.includes('bmp') || m.includes('mpu')) return 'sensor'
  return 'sensor'
}
