// src/modules/ai-chat/ChatPanel.tsx
import React, { useEffect, useRef, useState, useCallback, useReducer } from 'react'
import { useAppStore } from '../../store/app.store'
import { bus }         from '../../shared/event-bus'
import { AGENT_META }  from './agent-prompts'
import { useQAMode }   from './useQAMode'
import type { AgentRole } from '../../shared/event-bus'
import type { ActiveModelConfig } from '../../shared/llm-providers'

const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' }
const ORDER: AgentRole[] = ['analyst', 'architect', 'programmer']

// ── Chat entry ────────────────────────────────────────────────────────────────
interface ChatEntry {
  id: string; role: 'user' | 'system' | 'error' | 'ai'; content: string; ts: number
}

interface ChatState {
  entries: ChatEntry[]
  activeAgent: AgentRole | 'qa' | null
  tokenBuf: string
}
type ChatAction =
  | { type: 'ADD'; entry: ChatEntry }
  | { type: 'SET_AGENT'; role: AgentRole | 'qa' | null }
  | { type: 'TOKEN'; role: AgentRole | 'qa'; token: string }
  | { type: 'CLEAR_TOKEN' }

function chatReducer(s: ChatState, a: ChatAction): ChatState {
  switch (a.type) {
    case 'ADD':       return { ...s, entries: [...s.entries, a.entry] }
    case 'SET_AGENT': return { ...s, activeAgent: a.role, tokenBuf: a.role ? s.tokenBuf : '' }
    case 'TOKEN':     return { ...s, tokenBuf: (s.tokenBuf + a.token).slice(-600) }
    case 'CLEAR_TOKEN':return { ...s, tokenBuf: '', activeAgent: null }
    default:          return s
  }
}

// ── Mode selector ─────────────────────────────────────────────────────────────
type ChatMode = 'pipeline' | 'qa'

// ── ChatPanel ─────────────────────────────────────────────────────────────────
export function ChatPanel({
  onSubmit,
  activeConfig,
}: {
  onSubmit: (prompt: string) => void
  activeConfig: ActiveModelConfig | null
}) {
  const agents          = useAppStore(s => s.agents)
  const pipelineRunning = useAppStore(s => s.pipelineRunning)
  const guardError      = useAppStore(s => s.guardError)

  const [mode, setMode]           = useState<ChatMode>('pipeline')
  const [chat, dispatch]          = useReducer(chatReducer, { entries: [], activeAgent: null, tokenBuf: '' })
  const [input, setInput]         = useState('')
  const endRef                    = useRef<HTMLDivElement>(null)
  const abortRef                  = useRef<(() => void) | null>(null)

  const { qaContext, askQuestion, qaRunning } = useQAMode(activeConfig)

  // Subscribe to bus for chat events (pipeline mode)
  useEffect(() => {
    const onAgentStart = ({ role }: { role: AgentRole }) =>
      dispatch({ type: 'SET_AGENT', role })
    const onToken = ({ role, token }: { role: AgentRole; token: string }) =>
      dispatch({ type: 'TOKEN', role, token })
    const onPipeDone = ({ schema }: any) => {
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
    bus.on('pipeline:done',  onPipeDone)
    bus.on('pipeline:error', onPipeErr)
    return () => {
      bus.off('agent:start',    onAgentStart)
      bus.off('agent:token',    onToken)
      bus.off('pipeline:done',  onPipeDone)
      bus.off('pipeline:error', onPipeErr)
    }
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat.entries.length])

  // ── Pipeline mode submit ────────────────────────────────────────────────────
  const handlePipelineSubmit = useCallback(() => {
    const v = input.trim()
    if (!v || pipelineRunning) return
    dispatch({ type: 'ADD', entry: { id: `u_${Date.now()}`, role: 'user', ts: Date.now(), content: v }})
    setInput('')
    onSubmit(v)
  }, [input, pipelineRunning, onSubmit])

  // ── Q&A mode submit ─────────────────────────────────────────────────────────
  const handleQASubmit = useCallback(() => {
    const v = input.trim()
    if (!v || qaRunning) return
    dispatch({ type: 'ADD', entry: { id: `u_${Date.now()}`, role: 'user', ts: Date.now(), content: v }})
    dispatch({ type: 'SET_AGENT', role: 'qa' })
    setInput('')

    abortRef.current = askQuestion(v, {
      onToken: (token) => dispatch({ type: 'TOKEN', role: 'qa', token }),
      onDone: () => dispatch({ type: 'CLEAR_TOKEN' }),
      onError: (err) => {
        dispatch({ type: 'CLEAR_TOKEN' })
        dispatch({ type: 'ADD', entry: { id: `qe_${Date.now()}`, role: 'error', ts: Date.now(), content: `⚠ ${err}` }})
      },
    })
  }, [input, qaRunning, askQuestion])

  const handleSubmit = mode === 'qa' ? handleQASubmit : handlePipelineSubmit
  const isRunning = mode === 'qa' ? qaRunning : pipelineRunning

  const handleAbort = () => {
    abortRef.current?.()
    dispatch({ type: 'CLEAR_TOKEN' })
    bus.emit('pipeline:abort')
  }

  const SUGGS = [
    '用 ESP32 读取 DHT22 温湿度，OLED 显示',
    'HC-SR04 超声波测距，串口输出实时距离',
    '光敏电阻自动调节 LED 亮度，智能台灯',
    '按钮控制继电器，远程开关 220V 设备',
  ]

  const QA_SUGGS = [
    'ESP32 的 I2C 引脚默认是哪些？',
    '编译报错 "Board not available" 怎么解决？',
    'DHT22 和 ESP32 怎么接线？',
    '如何添加新的元器件到项目？',
  ]

  return (
    <div style={{ ...MONO, display: 'flex', flexDirection: 'column', height: '100%', background: '#0f2744' }}>

      {/* ── Mode toggle + status bar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 6,
        background: '#162d4a', borderBottom: '1px solid #2a4a6f', flexShrink: 0,
      }}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden', border: '1px solid #2a4a6f', flexShrink: 0 }}>
          {([
            { key: 'pipeline' as ChatMode, label: '⚡ 任务' },
            { key: 'qa' as ChatMode, label: '💬 答疑' },
          ]).map(t => (
            <button key={t.key} onClick={() => setMode(t.key)}
              style={{
                ...MONO, padding: '3px 9px', background: mode === t.key ? '#0a2a1a' : 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                color: mode === t.key ? '#ffffff' : '#9aabb8',
                transition: 'all .15s',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {mode === 'qa' ? (
          /* Q&A mode: show pipeline context summary */
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflowX: 'auto' }}>
            {qaContext.schema && (
              <span style={{ fontSize: 8, color: '#64b5f6', background: '#0a1628', border: '1px solid #1e3a5f',
                borderRadius: 3, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                📦 {qaContext.schema.meta.name}
              </span>
            )}
            {qaContext.pipelinePhase !== 'idle' && (
              <span style={{ fontSize: 8, color: '#fb923c', background: '#1a0d2e', border: '1px solid #fb923c30',
                borderRadius: 3, padding: '1px 6px', whiteSpace: 'nowrap' }}>
                {qaContext.pipelinePhase === 'done' ? '✓ 已完成' :
                 qaContext.pipelinePhase === 'error' ? '✗ 出错' :
                 `→ ${qaContext.pipelinePhase === 'analyst' ? '分析中' :
                    qaContext.pipelinePhase === 'architect' ? '设计中' :
                    qaContext.pipelinePhase === 'programmer' ? '编程中' : '处理中'}`}
              </span>
            )}
            <span style={{ fontSize: 8, color: '#9aabb8', whiteSpace: 'nowrap' }}>
              {qaContext.schema
                ? `${qaContext.schema.components.length} 芯片 · ${qaContext.schema.connections.length} 连接`
                : '等待项目生成'}
            </span>
          </div>
        ) : (
          /* Pipeline mode: show agent stages */
          <>
            <span style={{ fontSize: 9, color: '#9aabb8', letterSpacing: '.1em', flexShrink: 0 }}>流水线</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflowX: 'auto' }}>
              {ORDER.map((role, i) => {
                const meta  = AGENT_META[role]
                const agent = agents[role]
                const color = { idle:'#64b5f6', running:meta.color, done:'#00ff9d', error:'#ff6b6b', blocked:'#2a4a6f' }[agent.status] ?? '#64b5f6'
                const isRun = agent.status === 'running'
                return (
                  <React.Fragment key={role}>
                    {i > 0 && <div style={{ flex:'0 0 14px', height:1, background: agent.status!=='idle'?'#00ff9d30':'#2a4a6f' }} />}
                    <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 6px',
                      border:`1px solid ${color}30`, borderRadius:4, background: isRun ? `${color}08` : '#162d4a',
                      boxShadow: isRun ? `0 0 8px ${color}20` : 'none', transition:'all .3s', flexShrink:0 }}>
                      <div style={{ width:4, height:4, borderRadius:'50%', background:color,
                        boxShadow:`0 0 3px ${color}`, animation: isRun?'pulse-c .7s ease-in-out infinite':'none' }} />
                      <span style={{ fontSize:8, color }}>{meta.icon}</span>
                      <span style={{ fontSize:6.5, color }}>{meta.label}</span>
                    </div>
                  </React.Fragment>
                )
              })}
              {pipelineRunning && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                  <div style={{ width:4, height:4, borderRadius:'50%', background:'#4ade80', animation:'pulse-c 1s ease-in-out infinite' }} />
                  <span style={{ fontSize:7, color:'#00ff9d', letterSpacing:'.08em' }}>处理中</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Token preview ─────────────────────────────────────────────────── */}
      {chat.activeAgent && (
        <div style={{
          padding: '5px 12px', borderBottom: '1px solid #2a4a6f', background: '#162d4a', flexShrink: 0,
          ...(guardError ? { background:'#1a0a0a', borderBottomColor:'#ff6b6b40', animation:'shake .4s ease' } : {}),
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <span style={{ fontSize:8, fontWeight:700, letterSpacing:'.1em',
              color: chat.activeAgent === 'qa' ? '#00e5ff' : AGENT_META[chat.activeAgent as AgentRole].color }}>
              {chat.activeAgent === 'qa' ? '💬 答疑助手' : `${AGENT_META[chat.activeAgent as AgentRole].icon} ${AGENT_META[chat.activeAgent as AgentRole].label}`} · 正在生成
            </span>
            {guardError && (
              <span style={{ marginLeft:'auto', fontSize:7, fontWeight:700,
                padding:'1px 6px', borderRadius:3, background:'#1a0808', color:'#ff6b6b', border:'1px solid #ff6b6b40' }}>
                守卫拦截
              </span>
            )}
          </div>
          <div style={{ fontSize:8, lineHeight:1.5, maxHeight:52, overflow:'hidden',
            wordBreak:'break-all', color: guardError ? '#ff6b6b80' :
              chat.activeAgent === 'qa' ? '#00e5ff90' : `${AGENT_META[chat.activeAgent as AgentRole].color}90` }}>
            {guardError ? '流已终止 - 流水线守卫已激活' : chat.tokenBuf}
            {!guardError && <span style={{ display:'inline-block', width:4, height:8,
              background: chat.activeAgent === 'qa' ? '#00e5ff' : AGENT_META[chat.activeAgent as AgentRole].color,
              marginLeft:2, verticalAlign:'middle', animation:'blink-c .6s step-end infinite' }} />}
          </div>
          {guardError && (
            <div style={{ fontSize:8, color:'#ff6b6b', marginTop:4, padding:'4px 7px',
              background:'#1a0808', border:'1px solid #ff6b6b30', borderRadius:3, lineHeight:1.5 }}>
              {guardError}
            </div>
          )}
        </div>
      )}

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column' }}>
        {chat.entries.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'16px 0' }}>
            <div style={{ textAlign:'center', marginBottom:14 }}>
              <div style={{ fontSize:22, opacity:.15, marginBottom:5 }}>
                {mode === 'qa' ? '💬' : '⬡'}
              </div>
              <div style={{ fontSize:10, color: mode === 'qa' ? '#00e5ff' : '#00ffcc', letterSpacing:'.12em' }}>
                {mode === 'qa' ? '随时提问，我来解答' : '描述你的硬件需求'}
              </div>
              <div style={{ fontSize:8, color:'#5a7a9a', marginTop:3 }}>
                {mode === 'qa' ? '实时了解当前项目状态，可问任何问题' : '三个 Agent 顺序执行 · 流式输出'}
              </div>
            </div>
            {(mode === 'qa' ? QA_SUGGS : SUGGS).map(s => (
              <button key={s} onClick={() => setInput(s)} style={{
                ...MONO, fontSize:9, color:'#64b5f6', background:'#162d4a',
                border:'1px solid #2a4a6f', borderRadius:5, padding:'5px 10px', cursor:'pointer',
                textAlign:'left', letterSpacing:'.03em', lineHeight:1.5, marginBottom:5, transition:'all .15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.cssText += 'background:#0a2a1a;color:#00ff9d;border-color:#00ff9d60;' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.cssText += 'background:#162d4a;color:#64b5f6;border-color:#2a4a6f;' }}>
                › {s}
              </button>
            ))}
          </div>
        )}

        {chat.entries.map(e => {
          const isUser  = e.role === 'user'
          const isErr   = e.role === 'error'
          const isAI    = e.role === 'ai'
          const color   = isUser ? '#00ffcc' : isErr ? '#ff6b6b' : isAI ? '#00e5ff' : '#00ff9d'
          const bg      = isUser ? '#162d4a' : isErr ? '#1a0808' : isAI ? '#0a1628' : '#162d4a'
          const border  = isUser ? '#00ffcc25' : isErr ? '#ff6b6b25' : isAI ? '#00e5ff25' : '#00ff9d25'
          const now     = new Date(e.ts).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })
          return (
            <div key={e.id} style={{ display:'flex', gap:7, marginBottom:9, alignItems:'flex-start',
              flexDirection: isUser ? 'row-reverse' : 'row', animation:'fadeUp .2s ease' }}>
              <div style={{ width:22, height:22, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, borderRadius: isUser ? '50%' : 4,
                background: isUser ? '#162d4a' : isErr ? '#1a0808' : '#0a2a1a',
                border:`1px solid ${isUser?'#00ffcc40':isErr?'#ff6b6b40':'#00e5ff40'}`,
                color: isUser ? '#00ffcc' : isErr ? '#ff6b6b' : '#00e5ff' }}>
                {isUser ? '›_' : isErr ? '⚠' : '💬'}
              </div>
              <div>
                <div style={{ maxWidth:'83%', fontSize:9, lineHeight:1.7, padding:'7px 10px',
                  whiteSpace:'pre-wrap', wordBreak:'break-word',
                  borderRadius: isUser ? '10px 3px 10px 10px' : '3px 10px 10px 10px',
                  background:bg, border:`1px solid ${border}`, color }}>
                  {e.content}
                </div>
                <div style={{ fontSize:6, color:'#5a7a9a', marginTop:2, textAlign: isUser ? 'right' : 'left', letterSpacing:'.05em' }}>{now}</div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div style={{ borderTop:'1px solid #2a4a6f', background:'#162d4a', padding:'9px 12px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:7, alignItems:'flex-end', background:'#0f2744',
          border:'1px solid #2a4a6f', borderRadius:6, padding:'5px 7px 5px 10px' }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
            }}
            disabled={isRunning}
            rows={2}
            placeholder={
              mode === 'qa'
                ? '问任何关于项目、接线、代码、编译的问题...'
                : '描述硬件需求... (Ctrl+Enter 发送)'
            }
            style={{
              ...MONO, flex:1, background:'transparent', border:'none', outline:'none', resize:'none',
              fontSize:10, color:'#c0d0e0', lineHeight:1.6, letterSpacing:'.03em',
            }}
          />
          {isRunning
            ? <button onClick={handleAbort} style={{
                ...MONO, fontSize:8, fontWeight:700, letterSpacing:'.1em',
                padding:'4px 9px', borderRadius:4, cursor:'pointer', border:'1px solid #ff6b6b60',
                color:'#ff6b6b', background:'transparent', flexShrink:0, alignSelf:'flex-end',
              }}>■ 停止</button>
            : <button onClick={handleSubmit} disabled={!input.trim()} style={{
                ...MONO, fontSize:8, fontWeight:700, letterSpacing:'.1em',
                padding:'4px 9px', borderRadius:4, cursor: input.trim() ? 'pointer' : 'not-allowed',
                border: mode === 'qa' ? '1px solid #00e5ff60' : '1px solid #00ff9d60',
                color: mode === 'qa' ? '#00e5ff' : '#00ff9d', background:'#0a2a1a',
                flexShrink:0, alignSelf:'flex-end', opacity: input.trim() ? 1 : .35,
              }}>
              {mode === 'qa' ? '💬 提问' : '▶ 发送'}
            </button>
          }
        </div>
        <div style={{ marginTop:4, fontSize:7, color:'#3a5a7a', letterSpacing:'.08em', textAlign:'right' }}>
          Ctrl+Enter {mode === 'qa' ? '· 答疑模式' : '· 任务模式'} · ⚙ 右上角切换模型
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
