// src/modules/ai-chat/agent-runner.ts
import type { AIProjectSchema }   from '../../shared/types/project.schema'
import type { AgentRole }         from '../../shared/event-bus'
import type { ActiveModelConfig } from '../../shared/llm-providers'
import { AGENT_META }             from './agent-prompts'
import { streamLLM }              from './llm-caller'
import { validateAnalystOutput }  from './pipeline-guard'
import { emitGuardFail }          from '../../shared/event-bus'

export type PipelineEvent =
  | { type: 'agent_start';    agent: AgentRole }
  | { type: 'agent_token';    agent: AgentRole; token: string }
  | { type: 'agent_done';     agent: AgentRole; durationMs: number }
  | { type: 'agent_error';    agent: AgentRole; error: string }
  | { type: 'pipeline_done';  schema: AIProjectSchema }
  | { type: 'pipeline_error'; error: string }

export type PipelineEventHandler = (evt: PipelineEvent) => void

// ── 判断是否为 API 层面错误（需要立即终止，不走 Guard）────────────────────────
function isApiError(err: unknown): boolean {
  const msg = String(err)
  return (
    msg.includes('401') ||          // 认证失败
    msg.includes('403') ||          // 权限不足
    msg.includes('400') ||          // 请求错误（包含 Model Not Exist）
    msg.includes('429') ||          // 限流
    msg.includes('500') ||          // 服务器错误
    msg.includes('Model Not Exist')||
    msg.includes('Invalid API key')||
    msg.includes('Incorrect API key')||
    msg.includes('ECONNREFUSED') || // 连接被拒绝
    msg.includes('ENOTFOUND') ||    // DNS 解析失败
    msg.includes('fetch failed') || // 网络错误
    msg.includes('network')
  )
}

// ── 友好化 API 错误信息 ─────────────────────────────────────────────────────
function friendlyError(err: unknown, config: ActiveModelConfig): string {
  const msg = String(err)

  if (msg.includes('401') || msg.includes('Invalid API key') || msg.includes('Incorrect API key'))
    return `API Key 无效。请在 ⚙ 模型配置 中检查 ${config.providerId} 的 Key 是否正确。`

  if (msg.includes('Model Not Exist') || msg.includes('model_not_found'))
    return `模型 "${config.modelId}" 在 ${config.providerId} 上不存在。\n请在 ⚙ 模型配置 中切换到正确的模型版本。\n\nSiliconFlow 正确的模型ID示例：deepseek-ai/DeepSeek-V3`

  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('RateLimitError'))
    return `请求频率超限（429）。请稍等几秒后重试，或在 ⚙ 配置 中切换模型。`

  if (msg.includes('402') || msg.includes('insufficient_quota') || msg.includes('balance'))
    return `账户余额不足。请充值后重试。`

  if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('fetch failed'))
    return `网络连接失败。请检查：\n1. 是否需要代理\n2. API Base URL 是否正确（${config.baseUrl}）`

  if (msg.includes('400'))
    return `请求参数错误（400）：${msg.slice(0, 200)}`

  return `API 调用失败：${msg.slice(0, 300)}`
}

// ── JSON 提取（多策略）────────────────────────────────────────────────────────
function extractJson(text: string): unknown {
  // 策略1：剥 markdown 块
  const s1 = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // 策略2：找最外层 {}
  const start = s1.indexOf('{'), end = s1.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s1.slice(start, end + 1)) } catch {/* next */}
  }

  // 策略3：修复尾逗号再解析
  if (start !== -1 && end > start) {
    try {
      const fixed = s1.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1')
      return JSON.parse(fixed)
    } catch {/* next */}
  }

  throw new Error(`无法从模型输出中提取 JSON。\n原始输出前300字：\n${text.slice(0, 300)}`)
}

// ── Schema merger ─────────────────────────────────────────────────────────────
function mergeSchema(
  current:  Partial<AIProjectSchema>,
  incoming: Partial<AIProjectSchema>,
  role:     AgentRole
): Partial<AIProjectSchema> {
  switch (role) {
    case 'analyst':    return { ...current, meta: incoming.meta ?? current.meta, components: incoming.components ?? current.components }
    case 'architect':  return { ...current, connections: incoming.connections ?? current.connections }
    case 'programmer': return { ...current, blocklyWorkspace: incoming.blocklyWorkspace ?? current.blocklyWorkspace }
  }
}

// ── 单 Agent 调用 ─────────────────────────────────────────────────────────────
// 返回值：{ schema, apiError? }
// apiError 存在时表示 API 层错误，需立即终止 pipeline
async function runAgent(
  config:     ActiveModelConfig,
  role:       AgentRole,
  userPrompt: string,
  schema:     Partial<AIProjectSchema>,
  emit:       PipelineEventHandler,
  attempt     = 1
): Promise<{ schema: Partial<AIProjectSchema>; apiError?: string }> {

  const meta = AGENT_META[role]
  const t0   = Date.now()
  if (attempt === 1) emit({ type: 'agent_start', agent: role })

  let fullText = ''

  try {
    const retryNote = attempt > 1
      ? '\n\nIMPORTANT: Output ONLY raw JSON starting with { and ending with }. No other text.'
      : ''
    const userMsg =
      `User requirement: ${userPrompt}\n\n` +
      `Current schema:\n${JSON.stringify(schema, null, 2)}\n\n` +
      `Output the updated complete JSON.${retryNote}`

    console.log(`[${role}] provider=${config.providerId} model=${config.modelId} baseUrl=${config.baseUrl}`)

    for await (const chunk of streamLLM(config, meta.systemPrompt, userMsg, 4096)) {
      if ('token' in chunk) {
        fullText += chunk.token
        if (attempt === 1) emit({ type: 'agent_token', agent: role, token: chunk.token })
      }
    }

    console.log(`[${role}] output (${fullText.length}chars):`, fullText.slice(0, 200))

    const parsed  = extractJson(fullText) as Partial<AIProjectSchema>
    const updated = mergeSchema(schema, parsed, role)
    emit({ type: 'agent_done', agent: role, durationMs: Date.now() - t0 })
    return { schema: updated }

  } catch (err: any) {
    console.error(`[${role}] attempt ${attempt} error:`, err?.message ?? err)

    // API 错误 → 立即上报，不重试
    if (isApiError(err)) {
      const msg = friendlyError(err, config)
      emit({ type: 'agent_error', agent: role, error: msg })
      return { schema, apiError: msg }
    }

    // JSON 解析错误 → 重试一次
    if (attempt < 2) {
      emit({ type: 'agent_token', agent: role, token: '\n\n⟳ 正在重试...\n' })
      return runAgent(config, role, userPrompt, schema, emit, 2)
    }

    const msg = `JSON 解析失败（已重试）：${err?.message ?? err}`
    emit({ type: 'agent_error', agent: role, error: msg })
    return { schema, apiError: msg }
  }
}

// ── Pipeline 主流程 ───────────────────────────────────────────────────────────
const PIPELINE_ORDER: AgentRole[] = ['analyst', 'architect', 'programmer']

export async function runPipelineWithGuard(
  userPrompt: string,
  config:     ActiveModelConfig,
  emit:       PipelineEventHandler
): Promise<AIProjectSchema | null> {

  // 前置：检查 Key
  if (!config.apiKey?.trim()) {
    const msg = `未设置 API Key。请点击右上角 ⚙ 模型配置，填写 ${config.providerId} 的 API Key 后保存。`
    emit({ type: 'pipeline_error', error: msg })
    return null
  }

  let schema: Partial<AIProjectSchema> = {
    meta: undefined, components: [], connections: [], blocklyWorkspace: [],
  }

  for (const role of PIPELINE_ORDER) {
    const result = await runAgent(config, role, userPrompt, schema, emit)

    // API 错误 → 立即终止，封锁下游节点
    if (result.apiError) {
      emit({ type: 'pipeline_error', error: result.apiError })
      const downstream = PIPELINE_ORDER.slice(PIPELINE_ORDER.indexOf(role) + 1) as AgentRole[]
      emitGuardFail(result.apiError, downstream)
      return null
    }

    schema = result.schema

    // Analyst 完成 → Guard 检查
    if (role === 'analyst') {
      const guard = validateAnalystOutput(schema)
      if (!guard.ok) {
        const reason = guard.reason!
        emit({ type: 'agent_error',    agent: 'analyst', error: reason })
        emit({ type: 'pipeline_error', error: reason })
        emitGuardFail(reason, ['architect', 'programmer'])
        return null
      }
    }
  }

  const final = schema as AIProjectSchema
  emit({ type: 'pipeline_done', schema: final })
  return final
}
