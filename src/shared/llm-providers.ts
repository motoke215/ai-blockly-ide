// src/shared/llm-providers.ts
// All supported LLM providers with their metadata.
// Keys are persisted via electron-store (IPC channel: store:get/set).

export interface ModelVariant {
  id:          string   // API model string
  label:       string   // Display name
  contextK:    number   // Context window in K tokens
  recommended?: boolean
}

export interface LLMProvider {
  id:          string
  name:        string          // Display name
  logo:        string          // Emoji icon
  color:       string          // Accent color
  baseUrl:     string          // Default API base URL (editable)
  docsUrl:     string          // Key申请地址
  keyPrefix:   string          // e.g. "sk-" for OpenAI
  keyPlaceholder: string
  models:      ModelVariant[]
  // OpenAI-compatible means we can use the openai SDK
  openaiCompat: boolean
}

export const PROVIDERS: LLMProvider[] = [
  // ── Anthropic ──────────────────────────────────────────────────────────
  {
    id: 'anthropic', name: 'Anthropic Claude', logo: '⬡', color: '#d97706',
    baseUrl: 'https://api.anthropic.com',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyPrefix: 'sk-ant-', keyPlaceholder: 'sk-ant-api03-...',
    openaiCompat: false,
    models: [
      { id: 'claude-opus-4-5',    label: 'Claude Opus 4.5',    contextK: 200, recommended: false },
      { id: 'claude-sonnet-4-5',  label: 'Claude Sonnet 4.5',  contextK: 200, recommended: true  },
      { id: 'claude-haiku-4-5',   label: 'Claude Haiku 4.5',   contextK: 200 },
    ],
  },
  // ── OpenAI ────────────────────────────────────────────────────────────
  {
    id: 'openai', name: 'OpenAI', logo: '◎', color: '#10a37f',
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPrefix: 'sk-', keyPlaceholder: 'sk-proj-...',
    openaiCompat: true,
    models: [
      { id: 'gpt-4o',       label: 'GPT-4o',       contextK: 128, recommended: true },
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',  contextK: 128 },
      { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo',  contextK: 128 },
      { id: 'o1-preview',   label: 'o1-preview',   contextK: 128 },
    ],
  },
  // ── Google Gemini ──────────────────────────────────────────────────────
  {
    id: 'gemini', name: 'Google Gemini', logo: '✦', color: '#4285f4',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    keyPrefix: 'AIza', keyPlaceholder: 'AIzaSy...',
    openaiCompat: true,
    models: [
      { id: 'gemini-2.0-flash',          label: 'Gemini 2.0 Flash',          contextK: 1000, recommended: true },
      { id: 'gemini-1.5-pro',            label: 'Gemini 1.5 Pro',            contextK: 1000 },
      { id: 'gemini-1.5-flash',          label: 'Gemini 1.5 Flash',          contextK: 1000 },
    ],
  },
  // ── DeepSeek ──────────────────────────────────────────────────────────
  {
    id: 'deepseek', name: 'DeepSeek', logo: '◈', color: '#5b6ee1',
    baseUrl: 'https://api.deepseek.com/v1',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyPrefix: 'sk-', keyPlaceholder: 'sk-...',
    openaiCompat: true,
    models: [
      { id: 'deepseek-chat',     label: 'DeepSeek V3',          contextK: 64, recommended: true },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1 (推理)',   contextK: 64 },
    ],
  },
  // ── 通义千问 ──────────────────────────────────────────────────────────
  {
    id: 'qwen', name: '通义千问 (Qwen)', logo: '❋', color: '#ff6a00',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docsUrl: 'https://dashscope.console.aliyun.com/apiKey',
    keyPrefix: 'sk-', keyPlaceholder: 'sk-...',
    openaiCompat: true,
    models: [
      { id: 'qwen-max',        label: 'Qwen Max',         contextK: 32, recommended: true },
      { id: 'qwen-plus',       label: 'Qwen Plus',        contextK: 131 },
      { id: 'qwen-turbo',      label: 'Qwen Turbo',       contextK: 131 },
      { id: 'qwen2.5-coder-32b-instruct', label: 'Qwen2.5 Coder 32B', contextK: 131 },
    ],
  },
  // ── 智谱 GLM ──────────────────────────────────────────────────────────
  {
    id: 'zhipu', name: '智谱 GLM', logo: '⬟', color: '#2b5bd7',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    keyPrefix: '', keyPlaceholder: 'your-api-key',
    openaiCompat: true,
    models: [
      { id: 'glm-4-plus',  label: 'GLM-4 Plus',  contextK: 128, recommended: true },
      { id: 'glm-4-flash', label: 'GLM-4 Flash', contextK: 128 },
      { id: 'glm-4-air',   label: 'GLM-4 Air',   contextK: 128 },
    ],
  },
  // ── 月之暗面 Moonshot ─────────────────────────────────────────────────
  {
    id: 'moonshot', name: '月之暗面 (Kimi)', logo: '◑', color: '#7c3aed',
    baseUrl: 'https://api.moonshot.cn/v1',
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    keyPrefix: 'sk-', keyPlaceholder: 'sk-...',
    openaiCompat: true,
    models: [
      { id: 'moonshot-v1-128k', label: 'Kimi 128K', contextK: 128, recommended: true },
      { id: 'moonshot-v1-32k',  label: 'Kimi 32K',  contextK: 32 },
      { id: 'moonshot-v1-8k',   label: 'Kimi 8K',   contextK: 8 },
    ],
  },
  // ── MiniMax ───────────────────────────────────────────────────────────
  {
    id: 'minimax', name: 'MiniMax', logo: '▣', color: '#06b6d4',
    baseUrl: 'https://api.minimax.chat/v1',
    docsUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    keyPrefix: '', keyPlaceholder: 'your-api-key',
    openaiCompat: true,
    models: [
      { id: 'MiniMax-Text-01', label: 'MiniMax Text-01', contextK: 1000, recommended: true },
      { id: 'abab6.5s-chat',   label: 'ABAB 6.5s',       contextK: 245 },
    ],
  },
  // ── Groq ──────────────────────────────────────────────────────────────
  {
    id: 'groq', name: 'Groq (超快推理)', logo: '⚡', color: '#f97316',
    baseUrl: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_', keyPlaceholder: 'gsk_...',
    openaiCompat: true,
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',   contextK: 128, recommended: true },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',    contextK: 128 },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',    contextK: 32 },
    ],
  },
  // ── 硅基流动 ──────────────────────────────────────────────────────────
  {
    id: 'siliconflow', name: 'SiliconFlow (硅基流动)', logo: '⬢', color: '#6366f1',
    baseUrl: 'https://api.siliconflow.cn/v1',
    docsUrl: 'https://cloud.siliconflow.cn/account/ak',
    keyPrefix: 'sk-', keyPlaceholder: 'sk-...',
    openaiCompat: true,
    models: [
      { id: 'deepseek-ai/DeepSeek-V3',                  label: 'DeepSeek V3',       contextK: 64, recommended: true },
      { id: 'deepseek-ai/DeepSeek-R1',                  label: 'DeepSeek R1 (推理)',contextK: 64 },
      { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', label: 'DeepSeek R1 32B',   contextK: 32 },
      { id: 'Qwen/Qwen2.5-72B-Instruct',                label: 'Qwen2.5 72B',        contextK: 32 },
      { id: 'Qwen/Qwen2.5-32B-Instruct',                label: 'Qwen2.5 32B',        contextK: 32 },
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct',          label: 'Qwen2.5 Coder 32B', contextK: 32 },
      { id: 'THUDM/glm-4-9b-chat',                      label: 'GLM-4 9B',           contextK: 128 },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct',   label: 'Llama 3.1 70B',      contextK: 128 },
    ],
  },
  // ── 自定义 OpenAI 兼容 ────────────────────────────────────────────────
  {
    id: 'custom', name: '自定义 (OpenAI兼容)', logo: '⚙', color: '#6b7280',
    baseUrl: 'http://localhost:11434/v1',
    docsUrl: '',
    keyPrefix: '', keyPlaceholder: 'none / your-key',
    openaiCompat: true,
    models: [
      { id: 'custom-model', label: '自定义模型 ID', contextK: 8, recommended: true },
    ],
  },
]

export const PROVIDER_MAP = Object.fromEntries(PROVIDERS.map(p => [p.id, p]))

// ── Active config (selected at runtime) ────────────────────────────────────

export interface ActiveModelConfig {
  providerId:  string
  modelId:     string
  baseUrl:     string   // may be overridden by user
  apiKey:      string   // loaded from persistent store
}

export function buildConfig(
  providerId: string,
  modelId: string,
  keys: Record<string, string>,
  baseUrlOverrides: Record<string, string>
): ActiveModelConfig {
  const provider = PROVIDER_MAP[providerId]
  if (!provider) throw new Error(`Unknown provider: ${providerId}`)
  return {
    providerId,
    modelId:  modelId || provider.models.find(m => m.recommended)?.id || provider.models[0].id,
    baseUrl:  baseUrlOverrides[providerId] || provider.baseUrl,
    apiKey:   keys[providerId] || '',
  }
}
