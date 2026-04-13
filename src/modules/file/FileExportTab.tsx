// src/modules/file/FileExportTab.tsx
import React, { useState } from 'react'
import { saveAs } from 'file-saver'
import { useAppStore } from '../../store/app.store'
import { useFileApi } from './useFileApi'
import { generateBOMCSV, generateBOMJSON } from './exporters/bom-exporter'
import { generateKiCadSchematic } from './exporters/kicad-exporter'
import { captureWiringDiagramPNG } from './exporters/wiring-diagram-exporter'
import { exportFullProjectZIP } from './exporters/project-exporter'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }

interface ExportButton {
  label: string
  desc: string
  icon: string
  badge?: string
  action: () => Promise<void>
  disabled?: boolean
}

export function FileExportTab() {
  const schema = useAppStore(s => s.schema)
  const arduinoCode = useAppStore(s => s.arduinoCode)
  const { showSaveDialog } = useFileApi()
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState<'ok' | 'err'>('ok')

  const setStatusMsg = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setStatus(msg)
    setStatusType(type)
    setTimeout(() => setStatus(''), 3000)
  }

  const saveFile = async (defaultName: string, ext: string, content: string) => {
    const result = await showSaveDialog({
      title: '导出文件',
      defaultPath: defaultName,
      filters: [{ name: ext.toUpperCase() + ' Files', extensions: [ext] }],
    })
    if (result.canceled || !result.filePath) return false
    const writeResult = await (window as any).file.writeFile(result.filePath, content)
    if (!writeResult.ok) {
      setStatusMsg(`写入失败: ${writeResult.error}`, 'err')
      return false
    }
    return true
  }

  const savePNG = async (defaultName: string) => {
    try {
      const dataUrl = await captureWiringDiagramPNG()
      const result = await showSaveDialog({
        title: '导出 PNG',
        defaultPath: defaultName,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      })
      if (result.canceled || !result.filePath) return
      // Convert data URL to binary
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'image/png' })
      const { writeFile } = (window as any).file
      const writeResult = await writeFile(result.filePath, `data:image/png;base64,${base64}`)
      if (writeResult.ok) setStatusMsg('✓ PNG 导出成功', 'ok')
      else setStatusMsg(`失败: ${writeResult.error}`, 'err')
    } catch (e: any) {
      setStatusMsg(`PNG 导出失败: ${e.message}`, 'err')
    }
  }

  const exportBOMCSV = async () => {
    if (!schema) { setStatusMsg('请先生成或导入项目', 'err'); return }
    const csv = generateBOMCSV(schema)
    const ok = await saveFile(`${schema.meta.name}_BOM.csv`, 'csv', csv)
    if (ok) setStatusMsg('✓ BOM CSV 导出成功', 'ok')
  }

  const exportBOMJSON = async () => {
    if (!schema) { setStatusMsg('请先生成或导入项目', 'err'); return }
    const json = generateBOMJSON(schema)
    const ok = await saveFile(`${schema.meta.name}_BOM.json`, 'json', json)
    if (ok) setStatusMsg('✓ BOM JSON 导出成功', 'ok')
  }

  const exportKiCad = async () => {
    if (!schema) { setStatusMsg('请先生成或导入项目', 'err'); return }
    const sch = generateKiCadSchematic(schema)
    const ok = await saveFile(`${schema.meta.name}.kicad_sch`, 'kicad_sch', sch)
    if (ok) setStatusMsg('✓ KiCad 原理图导出成功', 'ok')
  }

  const exportPNG = async () => {
    if (!schema) { setStatusMsg('请先生成连线图后再导出', 'err'); return }
    await savePNG(`${schema.meta.name}_wiring.png`)
  }

  const exportZIP = async () => {
    if (!schema) { setStatusMsg('请先生成或导入项目', 'err'); return }
    setStatusMsg('正在打包...', 'ok')
    try {
      const blob = await exportFullProjectZIP(schema, arduinoCode)
      saveAs(blob, `${schema.meta.name}.aiprj`)
      setStatusMsg('✓ 全量项目 ZIP 导出成功', 'ok')
    } catch (e: any) {
      setStatusMsg(`ZIP 导出失败: ${e.message}`, 'err')
    }
  }

  const buttons: ExportButton[] = [
    {
      label: 'BOM 元件清单', desc: 'JLCPCB 标准格式 CSV',
      icon: '📊', badge: 'CSV', action: exportBOMCSV,
      disabled: !schema,
    },
    {
      label: 'BOM 元件清单', desc: '完整 JSON（含引脚定义）',
      icon: '📊', badge: 'JSON', action: exportBOMJSON,
      disabled: !schema,
    },
    {
      label: '连线图 PNG', desc: '元器件产品图片渲染接线图',
      icon: '🔌', badge: 'PNG', action: exportPNG,
      disabled: !schema,
    },
    {
      label: 'KiCad 原理图', desc: 'JLCPCB / 嘉立创可直接使用',
      icon: '🔧', badge: 'SCH', action: exportKiCad,
      disabled: !schema,
    },
    {
      label: '全量项目包', desc: 'ZIP（含 BOM + 原理图 + PNG + 代码）',
      icon: '📦', badge: 'ZIP', action: exportZIP,
      disabled: !schema,
    },
  ]

  return (
    <div style={{ ...MONO, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Status */}
      {status && (
        <div style={{
          fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', padding: '4px 8px',
          borderRadius: 4, background: statusType === 'ok' ? '#0a2a1a' : '#1a0808',
          color: statusType === 'ok' ? '#00ff9d' : '#ff6b6b',
          border: `1px solid ${statusType === 'ok' ? '#00ff9d30' : '#ff6b6b30'}`,
        }}>
          {status}
        </div>
      )}

      {/* Current project info */}
      {schema ? (
        <div style={{
          background: '#0a1628', border: '1px solid #2a4a6f', borderRadius: 5,
          padding: '6px 8px',
        }}>
          <div style={{ fontSize: 7, color: '#64b5f6', fontWeight: 700, marginBottom: 3, letterSpacing: '0.08em' }}>
            📦 {schema.meta.name}
          </div>
          <div style={{ fontSize: 7, color: '#5a7a9a', lineHeight: 1.8 }}>
            <div>◈ 元件: {schema.components.length} 个</div>
            <div>◈ 连线: {schema.connections.length} 条</div>
            <div>◈ 开发板: {schema.meta.targetBoard}</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 7, color: '#3a5a7a', textAlign: 'center', padding: '12px 0' }}>
          暂无项目数据，请先在左侧输入产品描述
        </div>
      )}

      {/* Export buttons */}
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={btn.action}
          disabled={btn.disabled}
          style={{
            ...MONO, display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 5, cursor: 'pointer', textAlign: 'left',
            background: '#162d4a', border: '1px solid #2a4a6f',
            opacity: btn.disabled ? 0.4 : 1,
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            if (!btn.disabled) {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = '#00ffcc40'
              el.style.background = '#0a2a1a'
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor = '#2a4a6f'
            el.style.background = '#162d4a'
          }}
        >
          <span style={{ fontSize: 16 }}>{btn.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, color: '#00ffcc', fontWeight: 700, letterSpacing: '0.05em' }}>
              {btn.label}
              {btn.badge && (
                <span style={{ marginLeft: 5, fontSize: 6, color: '#64b5f6',
                  background: '#0f2744', padding: '1px 4px', borderRadius: 2,
                  border: '1px solid #2a4a6f' }}>
                  {btn.badge}
                </span>
              )}
            </div>
            <div style={{ fontSize: 7, color: '#5a7a9a', letterSpacing: '0.04em', marginTop: 1 }}>
              {btn.desc}
            </div>
          </div>
          <span style={{ fontSize: 9, color: '#64b5f6' }}>›</span>
        </button>
      ))}

      {/* Format note */}
      <div style={{ fontSize: 6, color: '#3a5a7a', lineHeight: 1.6, marginTop: 4, textAlign: 'center' }}>
        BOM CSV / KiCad 原理图支持嘉立创 JLCPCB 直接下单
      </div>
    </div>
  )
}
