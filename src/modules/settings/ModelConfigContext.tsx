// src/modules/settings/ModelConfigContext.tsx
// React Context provider for model config — single source of truth for all components.
// No more isolated useModelConfig() state per component.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PROVIDER_MAP, type ActiveModelConfig, buildConfig } from '@/shared/llm-providers';

export interface ModelConfigState {
  selectedProviderId: string;
  selectedModels:     Record<string, string>;
  apiKeys:            Record<string, string>;
  baseUrlOverrides:   Record<string, string>;
  isLoaded:           boolean;
}

const store = () => (window as any).store;

const defaultState: ModelConfigState = {
  selectedProviderId: 'anthropic',
  selectedModels:     { anthropic: 'claude-sonnet-4-5' },
  apiKeys:            {},
  baseUrlOverrides:   {},
  isLoaded:           false,
};

interface ModelConfigContextValue {
  cfg:        ModelConfigState;
  activeConfig: ActiveModelConfig | null;
  hasKey:     (pid: string) => boolean;
  selectProvider: (id: string) => Promise<void>;
  selectModel:    (pid: string, mid: string) => Promise<void>;
  saveKey:       (pid: string, key: string) => Promise<void>;
  saveBaseUrl:   (pid: string, url: string) => Promise<void>;
}

const ModelConfigContext = createContext<ModelConfigContextValue | null>(null);

export function ModelConfigProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<ModelConfigState>(defaultState);

  // ── Load from persistent store on mount ──────────────────────────────────
  useEffect(() => {
    Promise.all([
      store().getSelectedProvider(),
      store().getSelectedModels(),
      store().getKeys(),
      store().getBaseUrls(),
    ]).then(([pid, models, keys, urls]) => {
      setCfg({ selectedProviderId: pid, selectedModels: models, apiKeys: keys, baseUrlOverrides: urls, isLoaded: true });
    });
  }, []);

  // ── Actions (all update the SAME shared state) ───────────────────────────
  const selectProvider = useCallback(async (providerId: string) => {
    setCfg(prev => ({ ...prev, selectedProviderId: providerId }));
    await store().setSelectedProvider(providerId);
  }, []);

  const selectModel = useCallback(async (providerId: string, modelId: string) => {
    setCfg(prev => ({
      ...prev,
      selectedModels: { ...prev.selectedModels, [providerId]: modelId },
    }));
    await store().setSelectedModel(providerId, modelId);
  }, []);

  const saveKey = useCallback(async (providerId: string, key: string) => {
    if (key.trim()) {
      await store().setKey(providerId, key.trim());
    } else {
      await store().deleteKey(providerId);
    }
    setCfg(prev => ({ ...prev, apiKeys: { ...prev.apiKeys, [providerId]: key.trim() } }));
  }, []);

  const saveBaseUrl = useCallback(async (providerId: string, url: string) => {
    await store().setBaseUrl(providerId, url);
    setCfg(prev => ({ ...prev, baseUrlOverrides: { ...prev.baseUrlOverrides, [providerId]: url } }));
  }, []);

  const activeConfig: ActiveModelConfig | null = cfg.isLoaded
    ? buildConfig(cfg.selectedProviderId, cfg.selectedModels[cfg.selectedProviderId] || '', cfg.apiKeys, cfg.baseUrlOverrides)
    : null;

  const hasKey = (pid: string) => !!cfg.apiKeys[pid]?.trim();

  return (
    <ModelConfigContext.Provider value={{ cfg, activeConfig, hasKey, selectProvider, selectModel, saveKey, saveBaseUrl }}>
      {children}
    </ModelConfigContext.Provider>
  );
}

// ── Hook to use the shared context ─────────────────────────────────────────
export function useModelConfig(): ModelConfigContextValue {
  const ctx = useContext(ModelConfigContext);
  if (!ctx) throw new Error('useModelConfig must be used inside ModelConfigProvider');
  return ctx;
}
