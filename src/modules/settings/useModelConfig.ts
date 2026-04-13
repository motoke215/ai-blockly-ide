// src/modules/settings/useModelConfig.ts
// Reactive hook over window.store — keeps UI in sync with persisted config.

import { useCallback, useEffect, useState } from 'react';
import { PROVIDERS, PROVIDER_MAP, type ActiveModelConfig, buildConfig } from '@/shared/llm-providers';

export interface ModelConfigState {
  selectedProviderId: string;
  selectedModels:     Record<string, string>;   // { providerId: modelId }
  apiKeys:            Record<string, string>;
  baseUrlOverrides:   Record<string, string>;
  isLoaded:           boolean;
}

const store = () => (window as any).store;

export function useModelConfig() {
  const [cfg, setCfg] = useState<ModelConfigState>({
    selectedProviderId: 'anthropic',
    selectedModels:     { anthropic: 'claude-sonnet-4-5' },
    apiKeys:            {},
    baseUrlOverrides:   {},
    isLoaded:           false,
  });

  // ── Load from persistent store on mount ────────────────────────────────
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

  // ── Actions ────────────────────────────────────────────────────────────

  const selectProvider = useCallback(async (providerId: string) => {
    // Optimistic update first for instant UI feedback
    setCfg(prev => ({ ...prev, selectedProviderId: providerId }));
    await store().setSelectedProvider(providerId);
  }, []);

  const selectModel = useCallback(async (providerId: string, modelId: string) => {
    // Optimistic update first for instant UI feedback
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

  // ── Derived: active config ready to pass to agent-runner ──────────────
  const activeConfig: ActiveModelConfig | null = cfg.isLoaded
    ? buildConfig(cfg.selectedProviderId, cfg.selectedModels[cfg.selectedProviderId] || '', cfg.apiKeys, cfg.baseUrlOverrides)
    : null;

  const hasKey = (pid: string) => !!cfg.apiKeys[pid]?.trim();

  return { cfg, activeConfig, hasKey, selectProvider, selectModel, saveKey, saveBaseUrl };
}
