// src/modules/file/FileMenuDropdown.tsx
// 顶部横向按钮组：导入 / 导出
import React, { useState } from 'react'
import { saveAs } from 'file-saver'
import { useAppStore } from '../../store/app.store'
import { useFileApi } from './useFileApi'
import { generateBOMCSV, generateBOMJSON } from './exporters/bom-exporter'
import { generateKiCadSchematic } from './exporters/kicad-exporter'
import { captureWiringDiagramPNG } from './exporters/wiring-diagram-exporter'
import { exportFullProjectZIP } from './exporters/project-exporter'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }

export function FileMenuDropdown() {
  const schema = useAppStore(s => s.schema)
  const arduinoCode = useAppStore(s => s.arduinoCode)
  const { showOpenDialog, showSaveDialog, readFile } = useFileApi()
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }

  const saveFile = async (name: string, ext: string, content: string): Promise<boolean> => {
    const result = await showSaveDialog({
      title: '导出文件',
      defaultPath: name,
      filters: [{ name: ext.toUpperCase() + ' Files', extensions: [ext] }],
    })
    if (result.canceled || !result.filePath) return false
    const writeResult = await (window as any).file.writeFile(result.filePath, content)
    return writeResult.ok
  }

  const savePNG = async () => {
    try {
      const dataUrl = await captureWiringDiagramPNG()
      const result = await showSaveDialog({
        title: '导出 PNG',
        defaultPath: `${schema?.meta.name ?? 'wiring'}.png`,
        filters: [{ name: 'PNG Image', extensions: ['png'] }],
      })
      if (result.canceled || !result.filePath) return
      const base64 = dataUrl.split(',')[1]
      await (window as any).file.writeFile(result.filePath, `data:image/png;base64,${base64}`)
    } catch (e: any) { alert(`导出失败: ${e.message}`) }
  }

  const handleImportText = async () => {
    const result = await showOpenDialog({
      title: '导入产品描述文档',
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }],
    })
    if (result.canceled || !result.filePaths?.length) return
    const readResult = await readFile(result.filePaths[0])
    if (!readResult.ok || !readResult.data) return
    const { bus } = await import('../../shared/event-bus')
    bus.emit('pipeline:start', { userPrompt: readResult.data })
    setImportOpen(false)
  }

  const handleImportBOM = async () => {
    const result = await showOpenDialog({
      title: '导入元件清单',
      filters: [{ name: 'Component List', extensions: ['json', 'csv'] }],
    })
    if (result.canceled || !result.filePaths?.length) return
    const readResult = await readFile(result.filePaths[0])
    if (!readResult.ok || !readResult.data) return
    const { parseComponentListJSON, parseComponentListCSV } = await import('./importers/component-importer')
    try {
      const ext = result.filePaths[0].split('.').pop()?.toLowerCase()
      const schema2 = ext === 'json' ? parseComponentListJSON(readResult.data) : parseComponentListCSV(readResult.data)
      const { bus } = await import('../../shared/event-bus')
      bus.emit('pipeline:start', { userPrompt: JSON.stringify(schema2) })
    } catch (e: any) { alert(`解析失败: ${e.message}`) }
    setImportOpen(false)
  }

  const handleExportBOMCSV = async () => {
    if (!schema) { alert('请先生成项目'); return }
    await saveFile(`${schema.meta.name}_BOM.csv`, 'csv', generateBOMCSV(schema))
    setExportOpen(false)
  }
  const handleExportBOMJSON = async () => {
    if (!schema) return
    await saveFile(`${schema.meta.name}_BOM.json`, 'json', generateBOMJSON(schema))
    setExportOpen(false)
  }
  const handleExportPNG = async () => {
    if (!schema) { alert('请先生成连线图'); return }
    await savePNG(); setExportOpen(false)
  }
  const handleExportKiCad = async () => {
    if (!schema) return
    await saveFile(`${schema.meta.name}.kicad_sch`, 'kicad_sch', generateKiCadSchematic(schema))
    setExportOpen(false)
  }
  const handleExportZIP = async () => {
    if (!schema) return
    try {
      const blob = await exportFullProjectZIP(schema, arduinoCode)
      saveAs(blob, `${schema.meta.name}.aiprj`)
    } catch (e: any) { alert(`导出失败: ${e.message}`) }
    setExportOpen(false)
  }

  const hi = (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '#1a3a5a' }
  const hiLeave = (e: MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }

  const Dropdown = ({ children, open, onClose }: { children: React.ReactNode; open: boolean; onClose: () => void }) => {
    if (!open) return null
    return (
      <div style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
        background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6,
        minWidth: 200, boxShadow: '0 8px 24px #00000060', overflow: 'hidden',
      }}>
        {children}
        <div style={{ padding: '5px 14px', fontSize: 6, color: '#3a5a7a', borderTop: '1px solid #1e3a5f', letterSpacing: '0.06em' }}>
          BOM CSV / KiCad 支持嘉立创
        </div>
      </div>
    )
  }

  const MenuBtn = ({ label, color, borderColor, onClick }: { label: string; color: string; borderColor: string; onClick: () => void }) => (
    <button onClick={onClick}
      style={{
        ...MONO, display: 'flex', alignItems: 'center', gap: 5,
        background: 'transparent', border: `1px solid ${borderColor}`,
        borderRadius: 4, color, fontSize: 9, padding: '3px 10px',
        cursor: 'pointer', letterSpacing: '0.08em', transition: 'all .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${borderColor}20` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      {label}
    </button>
  )

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* 导入按钮 */}
      <div style={{ position: 'relative' }}>
        <MenuBtn label="📥 导入" color="#64b5f6" borderColor="#2a4a6f" onClick={() => { setImportOpen(o => !o); setExportOpen(false) }} />
        <Dropdown open={importOpen} onClose={() => setImportOpen(false)}>
          <button onClick={handleImportText}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>T</span>
            <span style={{ flex: 1 }}>📝 产品描述文档</span>
            <span style={{ fontSize: 6, color: '#3a5a7a' }}>TXT / MD</span>
          </button>
          <button onClick={handleImportBOM}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>L</span>
            <span style={{ flex: 1 }}>📋 元件清单</span>
            <span style={{ fontSize: 6, color: '#3a5a7a' }}>JSON / CSV</span>
          </button>
        </Dropdown>
      </div>

      {/* 导出按钮 */}
      <div style={{ position: 'relative' }}>
        <MenuBtn label="📤 导出" color="#00ff9d" borderColor="#00ff9d40" onClick={() => { setExportOpen(o => !o); setImportOpen(false) }} />
        <Dropdown open={exportOpen} onClose={() => setExportOpen(false)}>
          <button onClick={handleExportBOMCSV}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>B</span>
            <span style={{ flex: 1 }}>📊 BOM 元件清单</span>
            <span style={{ fontSize: 6, color: '#64b5f6', background: '#0f2744', padding: '1px 4px', borderRadius: 2, border: '1px solid #2a4a6f' }}>CSV</span>
          </button>
          <button onClick={handleExportBOMJSON}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>B</span>
            <span style={{ flex: 1 }}>📊 BOM 元件清单</span>
            <span style={{ fontSize: 6, color: '#64b5f6', background: '#0f2744', padding: '1px 4px', borderRadius: 2, border: '1px solid #2a4a6f' }}>JSON</span>
          </button>
          <button onClick={handleExportPNG}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>P</span>
            <span style={{ flex: 1 }}>🔌 连线图 PNG</span>
          </button>
          <button onClick={handleExportKiCad}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>K</span>
            <span style={{ flex: 1 }}>🔧 KiCad 原理图</span>
            <span style={{ fontSize: 6, color: '#64b5f6', background: '#0f2744', padding: '1px 4px', borderRadius: 2, border: '1px solid #2a4a6f' }}>SCH</span>
          </button>
          <button onClick={handleExportZIP}
            style={{ ...MONO, width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#c0d0e0', fontSize: 9, letterSpacing: '0.05em', textAlign: 'left' }}
            onMouseEnter={hi}
            onMouseLeave={hiLeave}>
            <span style={{ width: 14, textAlign: 'center', color: '#64b5f6', fontSize: 10 }}>Z</span>
            <span style={{ flex: 1 }}>📦 全量项目包</span>
            <span style={{ fontSize: 6, color: '#64b5f6', background: '#0f2744', padding: '1px 4px', borderRadius: 2, border: '1px solid #2a4a6f' }}>ZIP</span>
          </button>
        </Dropdown>
      </div>

    </div>
  )
}
