// src/modules/hardware/CompilePanel.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useArduinoCli } from './useArduinoCli'
import { useAppStore }   from '../../store/app.store'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }
const LOG_COLORS: Record<string, string> = { info:'#64b5f6',warn:'#ffd700',error:'#ff6b6b',success:'#00ff9d',system:'#00ffcc' }
const PHASE_COLOR: Record<string, string> = { idle:'#64b5f6',compile:'#ffd700',upload:'#c084fc',done:'#00ff9d',error:'#ff6b6b' }
const PHASE_LABEL: Record<string, string> = { idle:'就绪',compile:'编译中',upload:'上传中',done:'完成',error:'错误' }

interface CompilePanelProps { onCodeChange?: (code: string) => void }

export function CompilePanel({ onCodeChange }: CompilePanelProps) {
  const { isRunning, phase, progress, logs, isCliAvailable, cliVersion, lastCompileOk, lastUploadOk,
    compile, refreshBoards, abort, clearLogs, boards } = useArduinoCli()

  const arduinoCode = useAppStore(s => s.arduinoCode)
  const sketchName  = useAppStore(s => s.sketchName)
  const schema      = useAppStore(s => s.schema)
  const board       = schema?.meta.targetBoard ?? 'esp32'

  const [port, setPort]   = useState('')
  const logEndRef          = useRef<HTMLDivElement>(null)

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs.length])
  useEffect(() => { refreshBoards() }, [])

  const handleCompile = () => compile({ sketchName, sourceCode: arduinoCode, board, port: port || undefined })

  const color = PHASE_COLOR[phase] ?? '#64b5f6'

  return (
    <div style={{ ...MONO, display: 'flex', flexDirection: 'column', height: '100%', background: '#0f2744' }}>

      {/* Phase header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#162d4a', borderBottom: '1px solid #2a4a6f', flexShrink: 0 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`,
          animation: isRunning ? 'pulse-c .8s ease-in-out infinite' : 'none', flexShrink: 0 }} />
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color }}>{PHASE_LABEL[phase]}</span>
        {isRunning && (
          <div style={{ flex: 1, height: 3, background: '#2a4a6f', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${color}80,${color})`,
              transition: 'width .35s ease', borderRadius: 2 }} />
          </div>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.08em', padding: '2px 6px', borderRadius: 3,
            color: isCliAvailable ? '#00ff9d' : '#ff6b6b', background: isCliAvailable ? '#0a2a1a' : '#1a0808',
            border: `1px solid ${isCliAvailable ? '#00ff9d50' : '#ff6b6b50'}` }}>
            {isCliAvailable ? `CLI ${cliVersion}` : 'CLI NOT FOUND'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
        borderBottom: '1px solid #1a2e1a', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 7, color: '#00ff9d', background: '#0a2a1a', border: '1px solid #00ff9d50',
          padding: '2px 7px', borderRadius: 4, letterSpacing: '.1em', fontWeight: 700 }}>⬡ {board.toUpperCase()}</span>

        <select value={port} onChange={e => setPort(e.target.value)} disabled={isRunning}
          style={{ ...MONO, background: '#0a0f0a', border: '1px solid #1a2e1a', borderRadius: 4,
            color: port ? '#e5e7eb' : '#4b5563', fontSize: 8, padding: '3px 7px', cursor: 'pointer' }}>
          <option value="">— SELECT PORT —</option>
          {boards.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <Btn onClick={refreshBoards} disabled={isRunning} label="⟳ PORTS" color="#60a5fa" />

        {isRunning
          ? <Btn onClick={abort}         label="■ 停止"                          color="#ff6b6b" />
          : <Btn onClick={handleCompile} label={port ? '▶ COMPILE & UPLOAD' : '▶ COMPILE'}
              color="#00ff9d" primary disabled={!isCliAvailable || !arduinoCode} />
        }
        <Btn onClick={clearLogs} disabled={isRunning} label="CLR" color="#6b7280" />

        {lastCompileOk !== null && !isRunning && (
          <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            color: lastCompileOk ? '#00ff9d' : '#ff6b6b', background: lastCompileOk ? '#0a2a1a' : '#1a0808',
            border: `1px solid ${lastCompileOk ? '#00ff9d50' : '#ff6b6b50'}` }}>
            {lastCompileOk ? '✓ COMPILED' : '✗ FAILED'}
          </span>
        )}
        {lastUploadOk !== null && !isRunning && (
          <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            color: lastUploadOk ? '#c084fc' : '#ff6b6b', background: lastUploadOk ? '#1a0d2e' : '#1a0808',
            border: `1px solid ${lastUploadOk ? '#c084fc30' : '#3a1a1a'}` }}>
            {lastUploadOk ? '✓ UPLOADED' : '✗ UPLOAD ERR'}
          </span>
        )}
      </div>

      {/* Log stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px', fontSize: 9, lineHeight: 1.65 }}>
        {logs.length === 0 && (
          <div style={{ color: '#1a3a1a', textAlign: 'center', marginTop: 30, fontSize: 8, letterSpacing: '.15em' }}>
            {arduinoCode ? 'READY TO COMPILE' : 'AWAITING AI CODE GENERATION'}
          </div>
        )}
        {logs.map((line, i) => {
          const now = new Date(line.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 1 }}>
              <span style={{ color: '#64b5f6', flexShrink: 0, fontSize: 8 }}>{now}</span>
              <span style={{ color: LOG_COLORS[line.level] ?? '#6b7280', wordBreak: 'break-all' }}>{line.text}</span>
            </div>
          )
        })}
        <div ref={logEndRef} />
      </div>
      <style>{`@keyframes pulse-c{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.45)}}`}</style>
    </div>
  )
}

function Btn({ onClick, label, color = '#9ca3af', disabled, primary }: {
  onClick: () => void; label: string; color?: string; disabled?: boolean; primary?: boolean
}) {
  const [h, setH] = React.useState(false)
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
        padding: '3px 9px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${color}60`, transition: 'all .15s',
        color:       disabled ? '#64b5f6' : primary && h ? '#0a0e1a' : color,
        background:  disabled ? '#0a0a0a' : primary && h ? color : h ? `${color}18` : primary ? `${color}20` : 'transparent',
        opacity:     disabled ? .4 : 1 }}>
      {label}
    </button>
  )
}
