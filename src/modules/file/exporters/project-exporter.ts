// src/modules/file/exporters/project-exporter.ts
// 全量项目 ZIP 导出（.aiprj）
import JSZip from 'jszip'
import type { AIProjectSchema } from '../../../shared/types/project.schema'
import { generateBOMCSV } from './bom-exporter'
import { generateKiCadProjectDir } from './kicad-exporter'
import { captureWiringDiagramPNG } from './wiring-diagram-exporter'

export async function exportFullProjectZIP(schema: AIProjectSchema, arduinoCode: string): Promise<Blob> {
  const zip = new JSZip()
  const folder = zip.folder(schema.meta.name.replace(/\s+/g, '_'))!
  const sketchName = schema.meta.name.replace(/\s+/g, '_')

  // project.json — 完整 schema
  folder.file('project.json', JSON.stringify(schema, null, 2))

  // bom.csv — JLCPCB 格式
  folder.file('bom.csv', generateBOMCSV(schema))

  // KiCad 原理图文件
  const kicadFiles = generateKiCadProjectDir(schema)
  for (const [filename, content] of Object.entries(kicadFiles)) {
    if (content) folder.file(filename, content)
  }

  // 连线图 PNG
  try {
    const pngDataUrl = await captureWiringDiagramPNG()
    const pngBase64 = pngDataUrl.split(',')[1]
    const pngBinary = atob(pngBase64)
    const pngBytes = new Uint8Array(pngBinary.length)
    for (let i = 0; i < pngBinary.length; i++) pngBytes[i] = pngBinary.charCodeAt(i)
    folder.file('wiring_diagram.png', pngBytes, { binary: true })
  } catch {
    // PNG capture optional — skip if canvas not ready
  }

  // Arduino 代码
  if (arduinoCode) {
    folder.file(`${sketchName}.ino`, arduinoCode)
  }

  return zip.generateAsync({ type: 'blob' }) as Promise<Blob>
}
