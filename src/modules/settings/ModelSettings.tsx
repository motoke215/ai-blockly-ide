// src/modules/settings/ModelSettings.tsx
// Full-featured model configuration panel.
// Each provider row: logo + name + key input + model select + base URL + status badge.

import React, { useState, useCallback } from 'react';
import { PROVIDERS } from '@/shared/llm-providers';
import { useModelConfig } from './useModelConfig';

const mono: React.CSSProperties = { fontFamily: '"JetBrains Mono","Fira Code",monospace' };

// ─── Main panel ───────────────────────────────────────────────────────────────

interface ModelSettingsProps {
  onClose: () => void;
}

export function ModelSettings({ onClose }: ModelSettingsProps) {
  const { cfg, activeConfig, hasKey, selectProvider, selectModel, saveKey, saveBaseUrl } = useModelConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showKeys,   setShowKeys]   = useState<Record<string, boolean>>({});
  const [keyDraft,   setKeyDraft]   = useState<Record<string, string>>({});
  const [urlDraft,   setUrlDraft]   = useState<Record<string, string>>({});
  const [saving,     setSaving]     = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    // Pre-fill drafts from store
    setKeyDraft(prev => ({ ...prev, [id]: cfg.apiKeys[id] || '' }));
    setUrlDraft(prev => ({ ...prev, [id]: cfg.baseUrlOverrides[id] || '' }));
  }, [cfg.apiKeys, cfg.baseUrlOverrides]);

  const handleSaveKey = useCallback(async (pid: string) => {
    setSaving(pid);
    await saveKey(pid, keyDraft[pid] || '');
    setTimeout(() => setSaving(null), 1000);
  }, [saveKey, keyDraft]);

  const handleSaveUrl = useCallback(async (pid: string) => {
    await saveBaseUrl(pid, urlDraft[pid] || '');
  }, [saveBaseUrl, urlDraft]);

  return (
    <div
      style={{
        ...mono,
        position:  'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,39,68,0.95)',
        backdropFilter: 'blur(8px)',
        display:   'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width:    740,
        maxHeight: '88vh',
        background: '#0f2744',
        border:    '1px solid #2a4a6f',
        borderRadius: 10,
        display:   'flex', flexDirection: 'column',
        overflow:  'hidden',
        boxShadow: '0 0 60px #00ff9d10',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #2a4a6f',
          background: '#0f2744', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#4ade80', fontSize: 14 }}>⚙</span>
            <div>
              <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, letterSpacing: '0.08em' }}>
                模型配置
              </div>
              <div style={{ fontSize: 8, color: '#64b5f6', marginTop: 2, letterSpacing: '0.06em' }}>
                API Keys 已加密存储至本地 · 当前选中：
                <span style={{ color: '#4ade80' }}>
                  {` ${activeConfig?.providerId || '—'} / ${activeConfig?.modelId || '—'}`}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              ...mono, background: 'transparent', border: '1px solid #2a4a6f',
              borderRadius: 4, color: '#64b5f6', fontSize: 9, padding: '3px 10px',
              cursor: 'pointer', letterSpacing: '0.1em',
            }}
          >✕ CLOSE</button>
        </div>

        {/* ── Provider list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {PROVIDERS.map(provider => {
            const isActive   = cfg.selectedProviderId === provider.id;
            const isExpanded = expandedId === provider.id;
            const hasApiKey  = hasKey(provider.id);
            const selModel   = cfg.selectedModels[provider.id] || provider.models.find(m => m.recommended)?.id || provider.models[0].id;
            const selModelInfo = provider.models.find(m => m.id === selModel);

            return (
              <div
                key={provider.id}
                style={{
                  border:       `1px solid ${isActive ? provider.color + '50' : '#1a2e1a'}`,
                  borderRadius: 7,
                  marginBottom: 7,
                  overflow:     'hidden',
                  background:   isActive ? `${provider.color}08` : '#162d4a',
                  transition:   'all 0.2s',
                  boxShadow:    isActive ? `0 0 12px ${provider.color}15` : 'none',
                }}
              >
                {/* ── Provider row ── */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                  }}
                  onClick={() => toggleExpand(provider.id)}
                >
                  {/* Logo + name */}
                  <span style={{ fontSize: 16, color: provider.color, width: 22, textAlign: 'center' }}>
                    {provider.logo}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 10, color: isActive ? provider.color : '#9ca3af', fontWeight: 700, letterSpacing: '0.06em' }}>
                        {provider.name}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: 7, fontWeight: 700, letterSpacing: '0.1em',
                          padding: '1px 5px', borderRadius: 3,
                          color: '#0a0a0a', background: provider.color,
                        }}>ACTIVE</span>
                      )}
                    </div>
                    <div style={{ fontSize: 8, color: '#64b5f6', marginTop: 2 }}>
                      {selModelInfo?.label || selModel}
                      {selModelInfo && <span style={{ color: '#3a5a7a', marginLeft: 6 }}>· {selModelInfo.contextK}K ctx</span>}
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {hasApiKey ? (
                      <span style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                        padding: '2px 6px', borderRadius: 3,
                        color: '#4ade80', background: '#0d2010', border: '1px solid #1a3a20',
                      }}>✓ KEY SET</span>
                    ) : (
                      <span style={{
                        fontSize: 7, fontWeight: 700, letterSpacing: '0.08em',
                        padding: '2px 6px', borderRadius: 3,
                        color: '#64b5f6', background: '#162d4a', border: '1px solid #2a4a6f',
                      }}>NO KEY</span>
                    )}
                    <span style={{ color: '#64b5f6', fontSize: 9 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* ── Expanded config ── */}
                {isExpanded && (
                  <div style={{
                    borderTop: `1px solid ${provider.color}25`,
                    padding:   '12px 14px 14px',
                    background: '#162d4a',
                  }}>

                    {/* Select as active */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <button
                        onClick={() => {
                          // Auto-select recommended model if none selected yet
                          if (!cfg.selectedModels[provider.id]) {
                            const recommended = provider.models.find(m => m.recommended)?.id || provider.models[0]?.id
                            if (recommended) selectModel(provider.id, recommended)
                          }
                          selectProvider(provider.id);
                        }}
                        disabled={isActive}
                        style={{
                          ...mono, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
                          padding: '4px 12px', borderRadius: 4, cursor: isActive ? 'default' : 'pointer',
                          border:    `1px solid ${provider.color}60`,
                          color:     isActive ? '#64b5f6' : provider.color,
                          background:isActive ? '#2a4a6f' : `${provider.color}18`,
                          transition:'all 0.15s',
                        }}
                      >
                        {isActive ? '✓ 当前选中' : '选择此模型商'}
                      </button>
                      {provider.docsUrl && (
                        <a href={provider.docsUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: 8, color: provider.color, textDecoration: 'none', letterSpacing: '0.06em' }}>
                          获取 API Key ↗
                        </a>
                      )}
                    </div>

                    {/* Model selector */}
                    <FieldRow label="模型版本">
                      <select
                        value={selModel}
                        onChange={e => selectModel(provider.id, e.target.value)}
                        style={{
                          ...mono, flex: 1, background: '#162d4a', border: `1px solid ${provider.color}30`,
                          borderRadius: 4, color: '#c0d0e0', fontSize: 8, padding: '4px 8px',
                          cursor: 'pointer',
                        }}
                      >
                        {provider.models.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.label}{m.recommended ? '  ★' : ''}  — {m.contextK}K context
                          </option>
                        ))}
                      </select>
                    </FieldRow>

                    {/* API Key input */}
                    <FieldRow label="API Key">
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={keyDraft[provider.id] ?? ''}
                        onChange={e => setKeyDraft(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        placeholder={provider.keyPlaceholder}
                        style={{
                          ...mono, flex: 1, background: '#162d4a',
                          border: `1px solid ${hasKey(provider.id) ? provider.color + '50' : '#2a4a6f'}`,
                          borderRadius: 4, color: '#c0d0e0', fontSize: 9, padding: '4px 8px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => setShowKeys(p => ({ ...p, [provider.id]: !p[provider.id] }))}
                        style={{
                          ...mono, background: 'transparent', border: '1px solid #2a4a6f',
                          borderRadius: 4, color: '#64b5f6', fontSize: 8, padding: '4px 7px', cursor: 'pointer',
                        }}
                      >{showKeys[provider.id] ? '●' : '○'}</button>
                      <button
                        onClick={() => handleSaveKey(provider.id)}
                        style={{
                          ...mono, background: saving === provider.id ? '#0d2010' : `${provider.color}20`,
                          border: `1px solid ${provider.color}50`, borderRadius: 4,
                          color: provider.color, fontSize: 8, fontWeight: 700,
                          padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.08em',
                          transition: 'all 0.15s', whiteSpace: 'nowrap',
                        }}
                      >{saving === provider.id ? '✓ 已保存' : '保存'}</button>
                    </FieldRow>

                    {/* Base URL (editable) */}
                    <FieldRow label="API Base URL">
                      <input
                        type="text"
                        value={urlDraft[provider.id] || provider.baseUrl}
                        onChange={e => setUrlDraft(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        onBlur={() => handleSaveUrl(provider.id)}
                        style={{
                          ...mono, flex: 1, background: '#162d4a', border: '1px solid #2a4a6f',
                          borderRadius: 4, color: '#00ffcc', fontSize: 8, padding: '4px 8px', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => { setUrlDraft(p => ({ ...p, [provider.id]: provider.baseUrl })); handleSaveUrl(provider.id); }}
                        style={{
                          ...mono, background: 'transparent', border: '1px solid #1a2e1a',
                          borderRadius: 4, color: '#6b7280', fontSize: 8, padding: '4px 7px',
                          cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >重置</button>
                    </FieldRow>

                    {/* Auto-generated full URL display */}
                    <div style={{
                      marginTop: 8, padding: '8px 10px', background: '#0a1628',
                      border: `1px solid ${provider.color}40`, borderRadius: 4, fontSize: 9,
                      color: '#ffffff', letterSpacing: '0.04em', wordBreak: 'break-all',
                      boxShadow: `0 0 8px ${provider.color}15`,
                    }}>
                      <div style={{ color: provider.color, marginBottom: 3, fontSize: 7, letterSpacing: '0.12em', fontWeight: 700 }}>▶ API ENDPOINT</div>
                      <div style={{ color: provider.color }}>
                        {(urlDraft[provider.id] || provider.baseUrl).replace(/\/$/, '')}/chat/completions
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid #2a4a6f',
          background: '#0f2744', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 7, color: '#3a5a7a', letterSpacing: '0.1em' }}>
            密钥加密存储于 %APPDATA%\ai-blockly-ide\config.json
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 7, color: '#64b5f6' }}>
              已配置 {Object.values(cfg.apiKeys).filter(Boolean).length} / {PROVIDERS.length - 1} 个服务商
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{
        fontSize: 8, color: '#00ffcc', letterSpacing: '0.06em',
        width: 80, flexShrink: 0, textAlign: 'right',
      }}>{label}</span>
      {children}
    </div>
  );
}
