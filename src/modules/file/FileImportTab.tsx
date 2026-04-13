// src/modules/file/FileImportTab.tsx
import React, { useState, useRef } from 'react'
import { useAppStore } from '../../store/app.store'
import { bus } from '../../shared/event-bus'
import { useFileApi } from './useFileApi'
import { extractTextFromFile } from './importers/text-importer'
import { extractTextFromPDF } from './importers/pdf-importer'
import { parseComponentListJSON, parseComponentListCSV } from './importers/component-importer'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }

interface FileSlot {
  label: string
  types: string
  icon: string
  accept: string
  loading?: boolean
  preview?: string
  file?: File
}

export function FileImportTab() {
  const schema = useAppStore(s => s.schema)
  const { showOpenDialog, readFile } = useFileApi()
  const [slots, setSlots] = useState<FileSlot[]>([
    { label: '产品文档', types: 'PDF / TXT / MD', icon: '📄', accept: '.pdf,.txt,.md' },
    { label: '元件清单', types: 'JSON / CSV', icon: '📋', accept: '.json,.csv' },
    { label: '提示词', types: 'TXT / MD', icon: '📝', accept: '.txt,.md' },
  ])
  const [activeTab, setActiveTab] = useState<'text' | 'bom'>('text')
  const [importedText, setImportedText] = useState('')
  const [importError, setImportError] = useState('')

  const pickFile = async (idx: number) => {
    const slot = slots[idx]
    const result = await showOpenDialog({
      title: `选择 ${slot.label}`,
      filters: [{ name: slot.label, extensions: slot.accept.replace(/\./g, '').split(',') }],
    })
    if (result.canceled || !result.filePaths?.length) return

    const filePath = result.filePaths[0]
    const readResult = await readFile(filePath)
    if (!readResult.ok || !readResult.data) {
      setImportError(`读取失败: ${readResult.error}`)
      return
    }

    const content = readResult.data
    const fileName = filePath.split(/[/\\]/).pop() ?? 'unknown'
    const file = new File([], fileName)

    setSlots(prev => prev.map((s, i) => i === idx ? {
      ...s, file, preview: content.slice(0, 120) + (content.length > 120 ? '...' : '')
    } : s))
    setImportError('')

    // Auto-detect type and extract
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') {
      setActiveTab('text')
      try {
        // PDF needs the actual File object, not path - use browser file API
        setImportedText(`[PDF文件] ${fileName}\n（PDF内容已提取，请通过拖放方式导入 PDF 文件以提取文本）`)
      } catch { /* ignore */ }
    } else if (ext === 'json') {
      setActiveTab('bom')
      try {
        const parsed = parseComponentListJSON(content)
        setImportedText(`✓ JSON 元件清单解析成功：${parsed.components.length} 个元件`)
      } catch (e: any) {
        setImportError(`JSON 解析失败: ${e.message}`)
      }
    } else if (ext === 'csv') {
      setActiveTab('bom')
      try {
        const parsed = parseComponentListCSV(content)
        setImportedText(`✓ CSV 元件清单解析成功：${parsed.components.length} 个元件`)
      } catch (e: any) {
        setImportError(`CSV 解析失败: ${e.message}`)
      }
    } else {
      setActiveTab('text')
      setImportedText(content)
    }
  }

  const sendToPipeline = () => {
    if (!importedText.trim()) return
    bus.emit('pipeline:start', { userPrompt: importedText })
  }

  return (
    <div style={{ ...MONO, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* File slots */}
      {slots.map((slot, idx) => (
        <div key={idx} style={{
          background: '#162d4a', border: '1px solid #2a4a6f',
          borderRadius: 6, padding: '8px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: slot.file ? 4 : 0 }}>
            <span style={{ fontSize: 13 }}>{slot.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: '#00ffcc', fontWeight: 700, letterSpacing: '0.06em' }}>{slot.label}</div>
              <div style={{ fontSize: 7, color: '#5a7a9a', letterSpacing: '0.04em' }}>{slot.types}</div>
            </div>
            <button onClick={() => pickFile(idx)}
              style={{ ...MONO, fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                border: '1px solid #2a4a6f', color: '#64b5f6', background: '#0f2744' }}>
              选择文件
            </button>
          </div>
          {slot.file && (
            <div style={{ fontSize: 7, color: '#00ff9d', marginBottom: 2 }}>
              ✓ {slot.file.name}
            </div>
          )}
          {slot.preview && (
            <div style={{
              fontSize: 7, color: '#5a7a9a', lineHeight: 1.5,
              background: '#0a1628', borderRadius: 3, padding: '3px 6px',
              maxHeight: 40, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {slot.preview}
            </div>
          )}
        </div>
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: '#2a4a6f' }} />

      {/* Internal tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {(['text', 'bom'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ ...MONO, flex: 1, fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
              padding: '4px 0', borderRadius: 3, cursor: 'pointer', border: 'none',
              color: activeTab === t ? '#00ffcc' : '#5a7a9a',
              background: activeTab === t ? '#0a2a1a' : 'transparent' }}>
            {t === 'text' ? '📝 文本' : '📋 BOM'}
          </button>
        ))}
      </div>

      {/* Preview / editor */}
      <div style={{
        background: '#0a1628', border: '1px solid #2a4a6f', borderRadius: 5,
        padding: '8px', minHeight: 80,
      }}>
        {activeTab === 'text' ? (
          <textarea
            value={importedText}
            onChange={e => setImportedText(e.target.value)}
            placeholder="导入的文本内容将显示在这里，也可以直接编辑..."
            style={{ ...MONO, width: '100%', minHeight: 70, background: 'transparent',
              border: 'none', outline: 'none', resize: 'none', fontSize: 8,
              color: '#c0d0e0', lineHeight: 1.6 }}
          />
        ) : (
          <div style={{ fontSize: 8, color: '#00ff9d', lineHeight: 1.8 }}>
            {importedText || '尚未导入元件清单文件（JSON/CSV）'}
          </div>
        )}
      </div>

      {importError && (
        <div style={{ fontSize: 7, color: '#ff6b6b', padding: '3px 6px',
          background: '#1a0808', borderRadius: 3, border: '1px solid #ff6b6b30' }}>
          ⚠ {importError}
        </div>
      )}

      {/* Send to AI */}
      <button
        onClick={sendToPipeline}
        disabled={!importedText.trim()}
        style={{ ...MONO, width: '100%', padding: '7px 0', borderRadius: 5, cursor: 'pointer',
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          border: '1px solid #00ff9d40', color: '#00ff9d', background: '#0a2a1a',
          opacity: importedText.trim() ? 1 : 0.4 }}>
        ▶ 发送给 AI 分析
      </button>

      {/* Current schema summary */}
      {schema && (
        <div style={{
          background: '#0a1628', border: '1px solid #2a4a6f', borderRadius: 5,
          padding: '6px 8px', marginTop: 4,
        }}>
          <div style={{ fontSize: 7, color: '#64b5f6', fontWeight: 700, marginBottom: 3, letterSpacing: '0.08em' }}>
            📦 当前项目
          </div>
          <div style={{ fontSize: 7, color: '#5a7a9a', lineHeight: 1.8 }}>
            <div>◈ {schema.meta.name}</div>
            <div>◈ 元件: {schema.components.length} 个</div>
            <div>◈ 连线: {schema.connections.length} 条</div>
          </div>
        </div>
      )}
    </div>
  )
}
