// src/modules/ai-chat/ChatPanel.tsx
import React, { useEffect, useRef, useState, useCallback, useReducer } from 'react'
import { useAppStore } from '../../store/app.store'
import { bus }         from '../../shared/event-bus'
import { AGENT_META }  from './agent-prompts'
import type { AgentRole } from '../../shared/event-bus'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }
const ORDER: AgentRole[] = ['analyst', 'architect', 'programmer']

interface ChatEntry { id: string; role: 'user' | 'system' | 'error'; content: string; ts: number }

interface ChatState { entries: ChatEntry[]; activeAgent: AgentRole | null; tokenBuf: string }
type ChatAction =
  | { type: 'ADD'; entry: ChatEntry }
  | { type: 'SET_AGENT'; role: AgentRole | null }
  | { type: 'TOKEN'; role: AgentRole; token: string }
  | { type: 'CLEAR_TOKEN' }

function chatReducer(s: ChatState, a: ChatAction): ChatState {
  switch (a.type) {
    case 'ADD':        return { ...s, entries: [...s.entries, a.entry] }
    case 'SET_AGENT':  return { ...s, activeAgent: a.role, tokenBuf: a.role ? s.tokenBuf : '' }
    case 'TOKEN':      return { ...s, tokenBuf: (s.tokenBuf + a.token).slice(-400) }
    case 'CLEAR_TOKEN':return { ...s, tokenBuf: '', activeAgent: null }
    default:           return s
  }
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────
export function ChatPanel({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const agents        = useAppStore(s => s.agents)
  const pipelineRunning = useAppStore(s => s.pipelineRunning)
  const guardError    = useAppStore(s => s.guardError)

  const [chat, dispatch]  = useReducer(chatReducer, { entries: [], activeAgent: null, tokenBuf: '' })
  const [input, setInput] = useState('')
  const endRef            = useRef<HTMLDivElement>(null)
  const abortRef          = useRef(false)

  // Subscribe to bus for chat-specific events
  useEffect(() => {
    const onAgentStart = ({ role }: { role: AgentRole }) => dispatch({ type: 'SET_AGENT', role })
    const onToken      = ({ role, token }: { role: AgentRole; token: string }) => dispatch({ type: 'TOKEN', role, token })
    const onAgentDone  = () => { /* keep showing until next agent or pipeline done */ }
    const onPipeDone   = ({ schema }: any) => {
      dispatch({ type: 'CLEAR_TOKEN' })
      dispatch({ type: 'ADD', entry: {
        id: `s_${Date.now()}`, role: 'system', ts: Date.now(),
        content: `✓ 选型 ${schema.components.length} 个元器件\n✓ 生成 ${schema.connections.length} 条连线\n✓ Blockly 积木 ${schema.blocklyWorkspace.length} 组\n→ 目标板：${schema.meta.targetBoard}`,
      }})
    }
    const onPipeErr = ({ message }: { message: string }) => {
      dispatch({ type: 'CLEAR_TOKEN' })
      dispatch({ type: 'ADD', entry: { id: `e_${Date.now()}`, role: 'error', ts: Date.now(), content: `⚠ ${message}` }})
    }
    bus.on('agent:start',    onAgentStart)
    bus.on('agent:token',    onToken)
    bus.on('agent:done',     onAgentDone)
    bus.on('pipeline:done',  onPipeDone)
    bus.on('pipeline:error', onPipeErr)
    return () => {
      bus.off('agent:start',    onAgentStart)
      bus.off('agent:token',    onToken)
      bus.off('agent:done',     onAgentDone)
      bus.off('pipeline:done',  onPipeDone)
      bus.off('pipeline:error', onPipeErr)
    }
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat.entries.length])

  const handleSubmit = useCallback(() => {
    const v = input.trim(); if (!v || pipelineRunning) return
    dispatch({ type: 'ADD', entry: { id: `u_${Date.now()}`, role: 'user', ts: Date.now(), content: v }})
    setInput(''); onSubmit(v)
  }, [input, pipelineRunning, onSubmit])

  const handleAbort = () => { abortRef.current = true; bus.emit('pipeline:abort') }

  const SUGGS = [
    '用 ESP32 读取 DHT22 温湿度，OLED 显示',
    'HC-SR04 超声波测距，串口输出实时距离',
    '光敏电阻自动调节 LED 亮度，智能台灯',
    '按钮控制继电器，远程开关 220V 设备',
  ]

  return (
    <div style={{ ...MONO, display: 'flex', flexDirection: 'column', height: '100%', background: '#0f2744' }}>

      {/* Pipeline status bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', gap: 5,
        background: '#162d4a', borderBottom: '1px solid #2a4a6f', flexShrink: 0, overflowX: 'auto' }}>
        <span style={{ fontSize: 7, color: '#64b5f6', letterSpacing: '.12em', flexShrink: 0 }}>流水线</span>
        {ORDER.map((role, i) => {
          const meta  = AGENT_META[role]
          const agent = agents[role]
          const color = { idle: '#64b5f6', running: meta.color, done: '#00ff9d', error: '#ff6b6b', blocked: '#2a4a6f' }[agent.status] ?? '#64b5f6'
          const isRun = agent.status === 'running'
          return (
            <React.Fragment key={role}>
              {i > 0 && <div style={{ flex: '0 0 16px', height: 1, background: agent.status !== 'idle' ? '#00ff9d40' : '#2a4a6f', transition: 'background .5s' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px',
                border: `1px solid ${color}30`, borderRadius: 5, background: isRun ? `${color}08` : '#162d4a',
                boxShadow: isRun ? `0 0 10px ${color}25` : 'none', transition: 'all .3s', flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color,
                  boxShadow: `0 0 4px ${color}`, animation: isRun ? 'pulse-c .7s ease-in-out infinite' : 'none' }} />
                <span style={{ fontSize: 9, color }}>{meta.icon}</span>
                <div>
                  <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '.06em', color }}>{meta.label}</div>
                  {agent.durationMs !== null && <div style={{ fontSize: 6, color: '#64b5f6' }}>{agent.durationMs}ms</div>}
                </div>
              </div>
            </React.Fragment>
          )
        })}
        {pipelineRunning && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse-c 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 7, color: '#00ff9d', letterSpacing: '.1em' }}>处理中</span>
          </div>
        )}
      </div>

      {/* Token preview */}
      {chat.activeAgent && (
        <div style={{
          padding: '5px 12px', borderBottom: '1px solid #2a4a6f', background: '#162d4a', flexShrink: 0,
          ...(guardError ? { background: '#1a0a0a', borderBottomColor: '#ff6b6b40', animation: 'shake .4s ease' } : {}),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '.1em', color: AGENT_META[chat.activeAgent].color }}>
              {AGENT_META[chat.activeAgent].icon} {AGENT_META[chat.activeAgent].label} · 正在生成
            </span>
            {guardError && <span style={{ marginLeft: 'auto', fontSize: 7, fontWeight: 700,
              padding: '1px 6px', borderRadius: 3, background: '#1a0808', color: '#ff6b6b', border: '1px solid #ff6b6b40' }}>守卫拦截</span>}
          </div>
          <div style={{ fontSize: 8, lineHeight: 1.5, maxHeight: 48, overflow: 'hidden',
            wordBreak: 'break-all', color: guardError ? '#ff6b6b60' : `${AGENT_META[chat.activeAgent].color}90` }}>
            {guardError ? '流已终止 - 流水线守卫已激活' : chat.tokenBuf}
            {!guardError && <span style={{ display: 'inline-block', width: 4, height: 8, background: AGENT_META[chat.activeAgent].color,
              marginLeft: 2, verticalAlign: 'middle', animation: 'blink-c .6s step-end infinite' }} />}
          </div>
          {guardError && (
            <div style={{ fontSize: 8, color: '#ff6b6b', marginTop: 4, padding: '4px 7px',
              background: '#1a0808', border: '1px solid #ff6b6b30', borderRadius: 3, lineHeight: 1.5 }}>{guardError}</div>
          )}
        </div>
      )}

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
        {chat.entries.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 24, opacity: .15, marginBottom: 6 }}>⬡</div>
              <div style={{ fontSize: 10, color: '#00ffcc', letterSpacing: '.15em' }}>描述你的硬件需求</div>
              <div style={{ fontSize: 8, color: '#64b5f6', marginTop: 3 }}>三个 Agent 顺序执行 · 流式输出</div>
            </div>
            {SUGGS.map(s => (
              <button key={s} onClick={() => setInput(s)} style={{ ...MONO, fontSize: 9, color: '#64b5f6', background: '#162d4a',
                border: '1px solid #2a4a6f', borderRadius: 5, padding: '6px 10px', cursor: 'pointer',
                textAlign: 'left', letterSpacing: '.03em', lineHeight: 1.5, marginBottom: 5, transition: 'all .15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.cssText += 'background:#0a2a1a;color:#00ff9d;border-color:#00ff9d60;' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.cssText += 'background:#0d1f2e;color:#64b5f6;border-color:#2a4a6f;' }}>
                › {s}
              </button>
            ))}
          </div>
        )}
        {chat.entries.map(e => {
          const isUser = e.role === 'user'
          const isErr  = e.role === 'error'
          const color  = isUser ? '#00ffcc' : isErr ? '#ff6b6b' : '#00ff9d'
          const bg     = isUser ? '#162d4a' : isErr ? '#1a0808' : '#162d4a'
          const border = isUser ? '#00ffcc25' : isErr ? '#ff6b6b25' : '#00ff9d25'
          const now    = new Date(e.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
          return (
            <div key={e.id} style={{ display: 'flex', gap: 7, marginBottom: 9, alignItems: 'flex-start',
              flexDirection: isUser ? 'row-reverse' : 'row', animation: 'fadeUp .2s ease' }}>
              <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, borderRadius: isUser ? '50%' : 5,
                background: isUser ? '#162d4a' : isErr ? '#1a0808' : '#0a2a1a',
                border: `1px solid ${isUser ? '#00ffcc40' : isErr ? '#ff6b6b40' : '#00ff9d40'}`,
                color: isUser ? '#00ffcc' : isErr ? '#ff6b6b' : '#00ff9d' }}>
                {isUser ? '›_' : isErr ? '⚠' : '⬡'}
              </div>
              <div>
                <div style={{ maxWidth: '82%', fontSize: 9, lineHeight: 1.7, padding: '7px 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  borderRadius: isUser ? '10px 3px 10px 10px' : '3px 10px 10px 10px', background: bg, border: `1px solid ${border}`, color }}>{e.content}</div>
                <div style={{ fontSize: 6, color: '#64b5f6', marginTop: 2, textAlign: isUser ? 'right' : 'left', letterSpacing: '.05em' }}>{now}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid #2a4a6f', background: '#162d4a', padding: '9px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end', background: '#0f2744',
          border: '1px solid #2a4a6f', borderRadius: 6, padding: '5px 7px 5px 10px' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
            disabled={pipelineRunning} rows={2} placeholder="描述硬件需求... (Ctrl+Enter 发送)"
            style={{ ...MONO, flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontSize: 10, color: '#c0d0e0', lineHeight: 1.6, letterSpacing: '.03em' }} />
          {pipelineRunning
            ? <button onClick={handleAbort} style={{ ...MONO, fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
                padding: '4px 9px', borderRadius: 4, cursor: 'pointer', border: '1px solid #ff6b6b60',
                color: '#ff6b6b', background: 'transparent', flexShrink: 0, alignSelf: 'flex-end' }}>■ 停止</button>
            : <button onClick={handleSubmit} disabled={!input.trim()}
                style={{ ...MONO, fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
                  padding: '4px 9px', borderRadius: 4, cursor: input.trim() ? 'pointer' : 'not-allowed',
                  border: '1px solid #00ff9d60', color: '#00ff9d', background: '#0a2a1a',
                  flexShrink: 0, alignSelf: 'flex-end', opacity: input.trim() ? 1 : .35 }}>▶ 发送</button>
          }
        </div>
        <div style={{ marginTop: 4, fontSize: 7, color: '#3a5a7a', letterSpacing: '.08em', textAlign: 'right' }}>
          Ctrl+Enter 发送 · ⚙ 右上角切换模型
        </div>
      </div>

      <style>{`
        @keyframes pulse-c { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.25;transform:scale(.45)} }
        @keyframes blink-c  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake    { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
      `}</style>
    </div>
  )
}
