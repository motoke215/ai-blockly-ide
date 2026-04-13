// src/modules/file/exporters/wiring-diagram-exporter.ts
import { useAppStore } from '../../../store/app.store'

export async function captureWiringDiagramPNG(): Promise<string> {
  const canvas = (useAppStore.getState() as any)._canvas
  if (!canvas?.toPng) {
    throw new Error('画布未初始化，请先生成连线图后再导出 PNG')
  }
  // Capture at 2x resolution for clarity
  return canvas.toPng({
    width: 1920,
    height: 1080,
    backgroundColor: '#0f2744',
  })
}
