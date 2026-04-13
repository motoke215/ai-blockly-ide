// src/modules/hardware/CompilePanel.tsx
// 硬件编译面板：编译 / BOM / 原理图
import React, { useEffect, useRef, useState } from 'react'
import { useArduinoCli } from './useArduinoCli'
import { useAppStore }   from '../../store/app.store'
import { generateBOMCSV } from '../file/exporters/bom-exporter'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }
const LOG_COLORS: Record<string, string> = { info:'#64b5f6',warn:'#ffd700',error:'#ff6b6b',success:'#00ff9d',system:'#00ffcc' }
const PHASE_COLOR: Record<string, string> = { idle:'#64b5f6',compile:'#ffd700',upload:'#c084fc',done:'#00ff9d',error:'#ff6b6b' }
const PHASE_LABEL: Record<string, string> = { idle:'就绪',compile:'编译中',upload:'上传中',done:'完成',error:'错误' }

type RightTab = 'compile' | 'bom' | 'schematic'

interface CompilePanelProps { onCodeChange?: (code: string) => void }

export function CompilePanel({ onCodeChange }: CompilePanelProps) {
  const { isRunning, phase, progress, logs, isCliAvailable, cliVersion, lastCompileOk, lastUploadOk,
    compile, refreshBoards, abort, clearLogs, boards } = useArduinoCli()

  const arduinoCode = useAppStore(s => s.arduinoCode)
  const sketchName  = useAppStore(s => s.sketchName)
  const schema      = useAppStore(s => s.schema)
  const board       = schema?.meta.targetBoard ?? 'esp32'

  const [tab, setTab]       = useState<RightTab>('compile')
  const [port, setPort]    = useState('')
  const [copied, setCopied] = useState(false)
  const logEndRef           = useRef<HTMLDivElement>(null)

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs.length])
  useEffect(() => { refreshBoards() }, [])

  const handleCompile = () => compile({ sketchName, sourceCode: arduinoCode, board, port: port || undefined })

  const color = PHASE_COLOR[phase] ?? '#64b5f6'

  // ── BOM Data ─────────────────────────────────────────────────────────────────
  const bomLines = schema ? generateBOMCSV(schema).split('\n') : []
  const bomRows = bomLines.slice(1) // skip header

  // ── Connections Data ───────────────────────────────────────────────────────
  const connections = schema?.connections ?? []

  return (
    <div style={{ ...MONO, display: 'flex', flexDirection: 'column', height: '100%', background: '#0f2744' }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2a4a6f', flexShrink: 0, background: '#162d4a' }}>
        {([
          { key: 'compile' as RightTab, label: '⚡ 编译' },
          { key: 'bom' as RightTab, label: '📋 BOM' },
          { key: 'schematic' as RightTab, label: '🔧 原理图' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...MONO, flex: 1, padding: '7px 0', background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
              color: tab === t.key ? '#00ffcc' : '#5a7a9a',
              borderBottom: tab === t.key ? '2px solid #00ffcc' : '2px solid transparent',
              transition: 'all .2s', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 编译 Tab ─────────────────────────────────────────────────────── */}
      {tab === 'compile' && (
        <>
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
                {isCliAvailable ? `CLI ${cliVersion}` : '⚠ CLI 未安装'}
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
              <option value="">— 选择端口 —</option>
              {boards.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <Btn onClick={refreshBoards} disabled={isRunning} label="⟳ 端口" color="#60a5fa" />

            {isRunning
              ? <Btn onClick={abort}         label="■ 停止"                        color="#ff6b6b" />
              : <Btn onClick={handleCompile} label={port ? '▶ 编译并上传' : '▶ 编译'}
                  color="#00ff9d" primary disabled={!isCliAvailable || !arduinoCode} />
            }
            <Btn onClick={clearLogs} disabled={isRunning} label="清空" color="#6b7280" />

            {lastCompileOk !== null && !isRunning && (
              <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                color: lastCompileOk ? '#00ff9d' : '#ff6b6b', background: lastCompileOk ? '#0a2a1a' : '#1a0808',
                border: `1px solid ${lastCompileOk ? '#00ff9d50' : '#ff6b6b50'}` }}>
                {lastCompileOk ? '✓ 编译成功' : '✗ 编译失败'}
              </span>
            )}
            {lastUploadOk !== null && !isRunning && (
              <span style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                color: lastUploadOk ? '#c084fc' : '#ff6b6b', background: lastUploadOk ? '#1a0d2e' : '#1a0808',
                border: `1px solid ${lastUploadOk ? '#c084fc30' : '#3a1a1a'}` }}>
                {lastUploadOk ? '✓ 已上传' : '✗ 上传失败'}
              </span>
            )}
          </div>

          {/* Log stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px', fontSize: 9, lineHeight: 1.65 }}>
            {logs.length === 0 && (
              <div style={{ color: '#1a3a1a', textAlign: 'center', marginTop: 30, fontSize: 8, letterSpacing: '.15em' }}>
                {arduinoCode ? '等待编译...' : '等待 AI 生成代码...'}
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
        </>
      )}

      {/* ── BOM Tab ───────────────────────────────────────────────────────── */}
      {tab === 'bom' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {!schema ? (
            <div style={{ color: '#3a5a7a', textAlign: 'center', marginTop: 40, fontSize: 9, letterSpacing: '.1em' }}>
              等待生成项目...
            </div>
          ) : (
            <>
              {/* BOM Header */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: '#00ffcc', fontWeight: 700, letterSpacing: '.08em', marginBottom: 3 }}>
                  📋 元件清单 ({bomRows.length} 项)
                </div>
                <div style={{ fontSize: 7, color: '#5a7a9a' }}>
                  {schema.meta.name} · 目标板: {schema.meta.targetBoard.toUpperCase()}
                </div>
              </div>

              {/* BOM Table */}
              <div style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 70px 50px',
                  padding: '5px 10px', background: '#162d4a', borderBottom: '1px solid #2a4a6f',
                  fontSize: 7, color: '#64b5f6', fontWeight: 700, letterSpacing: '.08em' }}>
                  <span>型号</span>
                  <span>标号</span>
                  <span>封装</span>
                  <span style={{ textAlign: 'right' }}>数量</span>
                </div>
                {/* Rows */}
                {bomRows.map((row, i) => {
                  const cols = row.replace(/"/g, '').split(',')
                  if (cols.length < 4) return null
                  const [model, label, footprint, qty] = cols
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1fr 60px 70px 50px',
                      padding: '4px 10px', borderBottom: i < bomRows.length - 1 ? '1px solid #1e3a5f' : 'none',
                      fontSize: 8, color: '#c0d0e0',
                    }}>
                      <span style={{ color: '#00ff9d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{model}</span>
                      <span style={{ color: '#64b5f6', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                      <span style={{ color: '#5a7a9a', fontSize: 7 }}>{footprint}</span>
                      <span style={{ textAlign: 'right', color: '#fb923c', fontWeight: 700 }}>{qty}</span>
                    </div>
                  )
                })}
              </div>

              {/* Components detail */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 8, color: '#64b5f6', fontWeight: 700, letterSpacing: '.08em', marginBottom: 6 }}>◈ 元器件详情</div>
                {schema.components.map(comp => (
                  <div key={comp.id} style={{
                    background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 5,
                    padding: '5px 8px', marginBottom: 5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 8, color: '#00ffcc', fontWeight: 700 }}>{comp.label}</span>
                      <span style={{ fontSize: 7, color: '#5a7a9a' }}>{comp.model}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 6, color: '#64b5f6', background: '#0f2744',
                        padding: '1px 5px', borderRadius: 3, border: '1px solid #2a4a6f' }}>
                        {comp.type.toUpperCase()}
                      </span>
                    </div>
                    {comp.pins.length > 0 && (
                      <div style={{ fontSize: 7, color: '#3a5a7a', lineHeight: 1.7 }}>
                        引脚: {comp.pins.map(p => `${p.name}${p.gpioNum !== undefined ? `(GPIO${p.gpioNum})` : ''}`).join(' · ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 原理图 Tab ──────────────────────────────────────────────────── */}
      {tab === 'schematic' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {!schema ? (
            <div style={{ color: '#3a5a7a', textAlign: 'center', marginTop: 40, fontSize: 9, letterSpacing: '.1em' }}>
              等待生成项目...
            </div>
          ) : (
            <>
              {/* Pin connections summary */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#00ffcc', fontWeight: 700, letterSpacing: '.08em', marginBottom: 3 }}>
                  🔌 引脚连接表 ({connections.length} 条)
                </div>
                <div style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 50px',
                    padding: '5px 10px', background: '#162d4a', borderBottom: '1px solid #2a4a6f',
                    fontSize: 7, color: '#64b5f6', fontWeight: 700, letterSpacing: '.08em' }}>
                    <span>源引脚</span>
                    <span>目标引脚</span>
                    <span style={{ textAlign: 'right' }}>颜色</span>
                  </div>
                  {connections.map((conn, i) => {
                    const src = schema.components.find(c => c.id === conn.source.componentId)
                    const tgt = schema.components.find(c => c.id === conn.target.componentId)
                    const wireColor = conn.wireColor ?? 'yellow'
                    const colorMap: Record<string, string> = { red:'#ef4444', black:'#6b7280', yellow:'#fbbf24', blue:'#60a5fa', orange:'#fb923c', green:'#4ade80', white:'#e5e7eb', purple:'#c084fc' }
                    return (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 50px',
                        padding: '4px 10px', borderBottom: i < connections.length - 1 ? '1px solid #1e3a5f' : 'none',
                        fontSize: 8, color: '#c0d0e0', alignItems: 'center',
                      }}>
                        <span>
                          <span style={{ color: '#64b5f6' }}>{src?.label ?? conn.source.componentId}</span>
                          <span style={{ color: '#00ff9d' }}>:{conn.source.pinName}</span>
                        </span>
                        <span>
                          <span style={{ color: '#64b5f6' }}>{tgt?.label ?? conn.target.componentId}</span>
                          <span style={{ color: '#fb923c' }}>:{conn.target.pinName}</span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorMap[wireColor] ?? '#fbbf24', display: 'inline-block' }} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* KiCad export hint */}
              <div style={{ background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6, padding: '10px' }}>
                <div style={{ fontSize: 8, color: '#64b5f6', fontWeight: 700, letterSpacing: '.08em', marginBottom: 5 }}>🔧 KiCad 原理图</div>
                <div style={{ fontSize: 7, color: '#5a7a9a', lineHeight: 1.7, marginBottom: 6 }}>
                  可导出 KiCad 原理图 (.kicad_sch) 格式，在嘉立创 JLCPCB 直接下单使用。
                </div>
                <div style={{ fontSize: 7, color: '#3a5a7a', lineHeight: 1.6 }}>
                  路径：标题栏 → 📤导出 → KiCad 原理图 (SCH)
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
      style={{ fontFamily: '"JetBrains Mono","Fira Code",monospace', fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
        padding: '3px 9px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${color}60`, transition: 'all .15s',
        color:       disabled ? '#64b5f6' : primary && h ? '#0a0e1a' : color,
        background:  disabled ? '#0a0a0a' : primary && h ? color : h ? `${color}18` : primary ? `${color}20` : 'transparent',
        opacity:     disabled ? .4 : 1 }}>
      {label}
    </button>
  )
}
