// src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { ModelSettings }     from './modules/settings/ModelSettings';
import { useModelConfig }    from './modules/settings/useModelConfig';
import { FileMenuDropdown }  from './modules/file/FileMenuDropdown';
import 'reactflow/dist/style.css';
import './store/app.store';   // trigger bus subscriptions

declare global {
  interface Window {
    updater?: {
      check: () => Promise<any>
      download: () => Promise<any>
      install: () => void
      onStatus: (cb: (msg: { status: string; data?: any; ts: number }) => void) => () => void
    }
  }
}

type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseDate?: string }
  | { state: 'downloading'; percent: number; speed?: string }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { cfg, activeConfig }           = useModelConfig();
  const [update, setUpdate] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    if (!window.updater) return
    const unsub = window.updater.onStatus(({ status, data }) => {
      switch (status) {
        case 'checking':       setUpdate({ state: 'checking' }); break
        case 'available':      setUpdate({ state: 'available', version: data.version, releaseDate: data.releaseDate }); break
        case 'not-available':  setUpdate({ state: 'idle' }); break
        case 'progress':        setUpdate({ state: 'downloading', percent: data.percent, speed: data.bytesPerSecond }); break
        case 'ready':          setUpdate({ state: 'ready', version: data.version }); break
        case 'error':          setUpdate({ state: 'error', message: data.message }); break
      }
    })
    window.updater.check().catch(() => {})
    return unsub
  }, [])

  const handleDownloadUpdate = useCallback(async () => {
    await window.updater?.download()
  }, [])

  const handleInstallUpdate = useCallback(() => {
    window.updater?.install()
  }, [])

  return (
    <ReactFlowProvider>
      {settingsOpen && <ModelSettings onClose={() => setSettingsOpen(false)} />}

      <MainLayout
        onOpenSettings={() => setSettingsOpen(true)}
        activeConfig={activeConfig}
        update={update}
        onDownloadUpdate={handleDownloadUpdate}
        onInstallUpdate={handleInstallUpdate}
      />
    </ReactFlowProvider>
  );
}


// ══════════════════════════════════════════════════════════════════════
// src/layouts/MainLayout.tsx  — complete with settings button + model badge
// ══════════════════════════════════════════════════════════════════════

import { useNodesState, useEdgesState }           from 'reactflow';
import { useAppStore }          from './store/app.store';
import { bus }                  from './shared/event-bus';
import { createWireSweeper }    from './modules/wiring/wire-animator';
import { runPipelineWithGuard } from './modules/ai-chat/agent-runner';
import { ChatPanel }            from './modules/ai-chat/ChatPanel';
import { WiringCanvas }         from './modules/wiring/WiringCanvas';
import { BreadboardCanvas }    from './modules/wiring/BreadboardCanvas';
import { CompilePanel }         from './modules/hardware/CompilePanel';
import type { ActiveModelConfig } from './shared/llm-providers';
import { PROVIDER_MAP }           from './shared/llm-providers';

interface MainLayoutProps {
  onOpenSettings: () => void;
  activeConfig:   ActiveModelConfig | null;
  update:         UpdateStatus;
  onDownloadUpdate: () => void;
  onInstallUpdate:  () => void;
}

// ── Titlebar ──────────────────────────────────────────────────────────────────
// ── History Dropdown ───────────────────────────────────────────────────────
function HistoryDropdown() {
  const history = useAppStore(s => s.history)
  const loadFromHistory = useAppStore(s => s.loadFromHistory)
  const clearHistory = useAppStore(s => s.clearHistory)
  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const fmt = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  return (
    <div ref={dropRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: '"JetBrains Mono",monospace', fontSize: 8, fontWeight: 700,
          letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
          border: `1px solid ${open ? '#00ffcc50' : '#2a4a6f'}`,
          color: open ? '#00ffcc' : '#5a7a9a', background: open ? '#0a2a1a' : 'transparent',
          transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4,
        }}
        onMouseEnter={e => { if (!open) { (e.currentTarget as HTMLElement).style.color = '#00ffcc'; (e.currentTarget as HTMLElement).style.borderColor = '#00ffcc50' } }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.color = '#5a7a9a'; (e.currentTarget as HTMLElement).style.borderColor = '#2a4a6f' } }}
      >
        <span style={{ fontSize: 10 }}>📋</span>
        <span>历史</span>
        {history.length > 0 && (
          <span style={{ background: '#2a4a6f', borderRadius: 3, padding: '0 4px', fontSize: 7 }}>{history.length}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 300,
          background: '#0d1e33', border: '1px solid #2a4a6f', borderRadius: 6,
          minWidth: 280, maxWidth: 340, boxShadow: '0 8px 24px #00000060', overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #1e3a5f',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 7, fontWeight: 700,
              color: '#64b5f6', letterSpacing: '0.1em' }}>
              历史记录 ({history.length})
            </span>
            {history.length > 0 && (
              <button onClick={() => { clearHistory(); setOpen(false) }}
                style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 6, color: '#ff6b6b',
                  background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.06em' }}>
                清空
              </button>
            )}
          </div>

          {history.length === 0 && (
            <div style={{ padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 8, color: '#3a5a7a' }}>
                暂无历史记录
              </div>
            </div>
          )}

          {history.map(entry => (
            <button
              key={entry.id}
              onClick={() => { loadFromHistory(entry.id); setOpen(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', background: 'transparent', border: 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'background .1s',
                borderBottom: '1px solid #1e3a5f',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a3a5a' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: entry.compileOk === true ? '#00ff9d' : entry.compileOk === false ? '#ff6b6b' : '#fbbf24',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 8, fontWeight: 700,
                  color: '#c0d0e0', letterSpacing: '0.04em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </div>
                <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 6.5, color: '#5a7a9a', marginTop: 1 }}>
                  {entry.targetBoard.toUpperCase()} · {entry.componentCount}芯片/{entry.connectionCount}连线 · {fmt(entry.timestamp)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Titlebar ────────────────────────────────────────────────────────────────
function Titlebar({ onOpenSettings, update, onDownloadUpdate, onInstallUpdate }: Omit<MainLayoutProps, 'activeConfig'>) {
  const { pipelineRunning, lastCompileOk, schema } = useAppStore(s => ({
    pipelineRunning: s.pipelineRunning,
    lastCompileOk:   s.lastCompileOk,
    schema:          s.schema,
  }));

  // Read active config directly from store — stays in sync regardless of prop drilling
  const { activeConfig } = useModelConfig()
  const provider = activeConfig ? PROVIDER_MAP[activeConfig.providerId] : null;
  const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono",monospace' };

  return (
    <header style={{
      ...mono, height: 40, flexShrink: 0,
      background: '#0f2744', borderBottom: '1px solid #2a4a6f',
      display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, zIndex: 50,
    }}>
      <span style={{ color: '#00ffcc', fontSize: 15 }}>⬡</span>
      <span style={{ color: '#00ffcc', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
        AI-BLOCKLY-IDE
      </span>
      <div style={{ width: 1, height: 14, background: '#2a4a6f' }} />

      {/* History dropdown */}
      <HistoryDropdown />

      <div style={{ width: 1, height: 14, background: '#2a4a6f' }} />
      {schema && (
        <span style={{ color: '#64b5f6', fontSize: 8, letterSpacing: '0.05em' }}>{schema.meta.name}</span>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {pipelineRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff9d', animation: 'pulse-global 0.8s ease-in-out infinite' }} />
            <span style={{ fontSize: 8, color: '#00ff9d', letterSpacing: '0.1em' }}>AI 处理中</span>
          </div>
        )}

        {lastCompileOk !== null && (
          <span style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
            padding: '2px 6px', borderRadius: 3,
            color:    lastCompileOk ? '#00ff9d' : '#ff6b6b',
            background: lastCompileOk ? '#0d2010' : '#200d0d',
            border: `1px solid ${lastCompileOk ? '#00ff9d50' : '#ff6b6b50'}`,
          }}>{lastCompileOk ? '✓ 编译成功' : '✗ 编译错误'}</span>
        )}

        {/* Active model badge */}
        {activeConfig && provider && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: `${provider.color}12`, border: `1px solid ${provider.color}30`,
            borderRadius: 4, padding: '2px 8px',
          }}>
            <span style={{ color: provider.color, fontSize: 11 }}>{provider.logo}</span>
            <div>
              <div style={{ fontSize: 7, color: provider.color, fontWeight: 700, letterSpacing: '0.06em' }}>
                {activeConfig.modelId}
              </div>
              <div style={{ fontSize: 6, color: '#5a7a9a', letterSpacing: '0.05em' }}>
                {provider.name}
              </div>
            </div>
            {!activeConfig.apiKey && (
              <span style={{ fontSize: 7, color: '#ff6b6b', letterSpacing: '0.05em' }}>⚠ 无密钥</span>
            )}
          </div>
        )}

        <FileMenuDropdown />

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          style={{
            ...mono, background: 'transparent', border: '1px solid #2a4a6f',
            borderRadius: 4, color: '#64b5f6', fontSize: 9, padding: '3px 9px',
            cursor: 'pointer', letterSpacing: '0.08em', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00ffcc'; (e.currentTarget as HTMLElement).style.borderColor = '#00ffcc80'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64b5f6'; (e.currentTarget as HTMLElement).style.borderColor = '#2a4a6f'; }}
        >⚙ 模型配置</button>

        {/* Update notification */}
        {update.state === 'available' && (
          <button onClick={onDownloadUpdate} style={{
            ...mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
            padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
            border: '1px solid #f9731660', color: '#f97316', background: '#f9731615',
            animation: 'pulse-global 2s ease-in-out infinite',
          }}>⬆ v{update.version} 可更新</button>
        )}
        {update.state === 'downloading' && (
          <span style={{
            ...mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
            padding: '3px 9px', borderRadius: 4,
            border: '1px solid #60a5fa60', color: '#60a5fa', background: '#60a5fa15',
          }}>⬇ 下载中 {update.percent}%</span>
        )}
        {update.state === 'ready' && (
          <button onClick={onInstallUpdate} style={{
            ...mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
            padding: '3px 9px', borderRadius: 4, cursor: 'pointer',
            border: '1px solid #4ade8060', color: '#4ade80', background: '#4ade8015',
          }}>⬆ 重启安装 v{update.version}</button>
        )}
        {update.state === 'checking' && (
          <span style={{ ...mono, fontSize: 7, color: '#64b5f6', letterSpacing: '0.06em' }}>⬆ 检查更新...</span>
        )}
      </div>
    </header>
  );
}

// ── Resize handle ─────────────────────────────────────────────────────────────
function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
  const dragging = useRef(false);
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (dragging.current) onDrag(e.movementX); };
    const up = () => { dragging.current = false; };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, [onDrag]);
  return (
    <div onMouseDown={() => { dragging.current = true; }}
      style={{ width: 4, flexShrink: 0, cursor: 'col-resize', position: 'relative', zIndex: 10 }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 1, height: '60%', background: 'linear-gradient(to bottom,transparent,#2a4a6f,transparent)' }} />
    </div>
  );
}

// ── MainLayout ────────────────────────────────────────────────────────────────
export function MainLayout({ onOpenSettings, activeConfig, update, onDownloadUpdate, onInstallUpdate }: MainLayoutProps) {
  const [chatW,    setChatW]    = React.useState(340);
  const [compileW, setCompileW] = React.useState(360);
  const [canvasTab, setCanvasTab] = React.useState<'wiring'|'breadboard'>('wiring');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { registerWireSweep } = useAppStore(s => ({ registerWireSweep: s.registerWireSweep }));
  const schema = useAppStore(s => s.schema);

  useEffect(() => {
    registerWireSweep(createWireSweeper(setEdges, { sweepDurationMs: 700, staggerMs: 65 }));
  }, [setEdges, registerWireSweep]);

  const storeNodes = useAppStore(s => s.nodes);
  const storeEdges = useAppStore(s => s.edges);
  useEffect(() => { setNodes(storeNodes); }, [storeNodes]);
  useEffect(() => { setEdges(storeEdges); }, [storeEdges]);

  const handleSubmit = useCallback(async (userPrompt: string) => {
    if (!activeConfig?.apiKey) {
      bus.emit('pipeline:error', { message: `请先在 ⚙ 模型配置 中设置 ${activeConfig?.providerId || ''} 的 API Key` });
      return;
    }
    bus.emit('pipeline:start', { userPrompt });
    await runPipelineWithGuard(userPrompt, activeConfig, (evt) => {
      switch (evt.type) {
        case 'agent_start':    bus.emit('agent:start', { role: evt.agent }); break;
        case 'agent_token':    bus.emit('agent:token', { role: evt.agent, token: evt.token }); break;
        case 'agent_done':     bus.emit('agent:done',  { role: evt.agent, durationMs: evt.durationMs }); break;
        case 'agent_error':    bus.emit('agent:error', { role: evt.agent, message: evt.error }); break;
        case 'pipeline_done':  bus.emit('pipeline:done',  { schema: evt.schema }); break;
        case 'pipeline_error': bus.emit('pipeline:error', { message: evt.error }); break;
      }
    });
  }, [activeConfig]);

  const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono",monospace' };

  return (
    <div style={{ ...mono, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0f2744' }}>
      <style>{`@keyframes pulse-global{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.5)}}`}</style>
      <Titlebar onOpenSettings={onOpenSettings}
        update={update} onDownloadUpdate={onDownloadUpdate} onInstallUpdate={onInstallUpdate} />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: chatW, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatPanel onSubmit={handleSubmit} activeConfig={activeConfig} />
        </div>
        <ResizeHandle onDrag={dx => setChatW(w => Math.max(280, Math.min(520, w + dx)))} />
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Canvas tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e3a5f', flexShrink: 0, background: '#0a1628' }}>
            {([
              { key: 'wiring' as const, label: '🔗 布线图' },
              { key: 'breadboard' as const, label: '🔧 面包板' },
            ]).map(t => (
              <button key={t.key} onClick={() => setCanvasTab(t.key)}
                style={{ ...mono, flex: 1, padding: '5px 0', background: 'transparent', border: 'none',
                  cursor: 'pointer', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em',
                  color: canvasTab === t.key ? '#00ffcc' : '#5a7a9a',
                  borderBottom: canvasTab === t.key ? '2px solid #00ffcc' : '2px solid transparent',
                  transition: 'all .2s', marginBottom: -1 }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Canvas content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {canvasTab === 'wiring' ? (
              <WiringCanvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                onNodeDragStop={(id, pos) => bus.emit('canvas:node-moved', { componentId: id, position: pos })} />
            ) : (
              <BreadboardCanvas schema={schema} />
            )}
          </div>
        </div>
        <ResizeHandle onDrag={dx => setCompileW(w => Math.max(280, Math.min(520, w - dx)))} />
        <div style={{ width: compileW, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CompilePanel onCodeChange={(code) => bus.emit('code:updated', { arduinoCode: code, sketchName: useAppStore.getState().sketchName })} />
        </div>
      </div>
    </div>
  );
}
