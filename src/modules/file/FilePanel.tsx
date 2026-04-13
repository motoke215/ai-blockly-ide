// src/modules/file/FilePanel.tsx
// 第四个面板：文件导入/导出
import React, { useState } from 'react'
import { FileImportTab } from './FileImportTab'
import { FileExportTab } from './FileExportTab'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }

type Tab = 'import' | 'export'

export function FilePanel() {
  const [tab, setTab] = useState<Tab>('import')

  return (
    <div style={{ ...MONO, display: 'flex', flexDirection: 'column', height: '100%', background: '#0f2744' }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #2a4a6f', flexShrink: 0,
        background: '#162d4a', gap: 0,
      }}>
        {(['import', 'export'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              ...MONO, flex: 1, padding: '8px 0', background: 'transparent',
              border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', color: tab === t ? '#00ffcc' : '#5a7a9a',
              borderBottom: tab === t ? '2px solid #00ffcc' : '2px solid transparent',
              transition: 'all .2s', marginBottom: -1,
            }}>
            {t === 'import' ? '📥 导入' : '📤 导出'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tab === 'import' ? <FileImportTab /> : <FileExportTab />}
      </div>
    </div>
  )
}
