// electron/store/key-store.ts
// Persists API keys + model selections via electron-store.
// Windows path: %APPDATA%\ai-blockly-ide\config.json  (auto-encrypted)

import Store from 'electron-store';

interface StoreSchema {
  apiKeys:          Record<string, string>;   // { providerId: apiKey }
  baseUrlOverrides: Record<string, string>;   // { providerId: customUrl }
  selectedProvider: string;
  selectedModel:    Record<string, string>;   // { providerId: modelId }
  windowBounds:     { width: number; height: number; x?: number; y?: number };
}

const defaults: StoreSchema = {
  apiKeys: {}, baseUrlOverrides: {},
  selectedProvider: 'anthropic',
  selectedModel: { anthropic: 'claude-sonnet-4-5' },
  windowBounds: { width: 1440, height: 900 },
};

export const keyStore = new Store<StoreSchema>({
  name: 'config',
  defaults,
  encryptionKey: 'ai-blockly-ide-v1',   // AES-256 at rest
});

export const storeAPI = {
  // ── API Keys ────────────────────────────────────────────────────────
  getKeys:    () => keyStore.get('apiKeys'),
  setKey:     (id: string, key: string) => {
    const k = keyStore.get('apiKeys'); k[id] = key; keyStore.set('apiKeys', k);
  },
  deleteKey:  (id: string) => {
    const k = keyStore.get('apiKeys'); delete k[id]; keyStore.set('apiKeys', k);
  },

  // ── Base URL overrides ──────────────────────────────────────────────
  getBaseUrls: () => keyStore.get('baseUrlOverrides'),
  setBaseUrl:  (id: string, url: string) => {
    const u = keyStore.get('baseUrlOverrides'); u[id] = url; keyStore.set('baseUrlOverrides', u);
  },

  // ── Model selection ─────────────────────────────────────────────────
  getSelectedProvider:  () => keyStore.get('selectedProvider'),
  setSelectedProvider:  (id: string) => keyStore.set('selectedProvider', id),
  getSelectedModels:    () => keyStore.get('selectedModel'),
  setSelectedModel:     (pid: string, mid: string) => {
    const m = keyStore.get('selectedModel'); m[pid] = mid; keyStore.set('selectedModel', m);
  },

  // ── Window state ────────────────────────────────────────────────────
  getWindowBounds: () => keyStore.get('windowBounds'),
  setWindowBounds: (b: StoreSchema['windowBounds']) => keyStore.set('windowBounds', b),

  // ── Safe summary (no keys exposed) ─────────────────────────────────
  getSummary: () => ({
    configuredProviders: Object.entries(keyStore.get('apiKeys'))
      .filter(([, v]) => !!v).map(([k]) => k),
    selectedProvider: keyStore.get('selectedProvider'),
    selectedModel:    keyStore.get('selectedModel'),
  }),
};
