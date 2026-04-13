// src/modules/ai-chat/agent-runner.ts
import type { AIProjectSchema }   from '../../shared/types/project.schema'
import type { AgentRole }         from '../../shared/event-bus'
import type { ActiveModelConfig } from '../../shared/llm-providers'
import { AGENT_META }             from './agent-prompts'
import { streamLLM }              from './llm-caller'
import { validateAnalystOutput }  from './pipeline-guard'
import { emitGuardFail }          from '../../shared/event-bus'
import { normalizeConnections }   from '../wiring/connection-normalizer'
import { validateProjectSchema, type SchemaValidationResult } from './schema-validator'

export type PipelineEvent =
  | { type: 'agent_start';    agent: AgentRole }
  | { type: 'agent_token';    agent: AgentRole; token: string }
  | { type: 'agent_done';     agent: AgentRole; durationMs: number }
  | { type: 'agent_error';    agent: AgentRole; error: string }
  | { type: 'pipeline_retry'; attempt: number; reason: string; roles: AgentRole[]; validation: SchemaValidationResult }
  | { type: 'pipeline_done';  schema: AIProjectSchema }
  | { type: 'pipeline_error'; error: string }

export type PipelineEventHandler = (evt: PipelineEvent) => void

const PIPELINE_ORDER: AgentRole[] = ['analyst', 'architect', 'programmer']
const MAX_VALIDATION_RETRIES = 2
const VALIDATION_PASS_SCORE = 85

function isApiError(err: unknown): boolean {
  const msg = String(err)
  return (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('400') ||
    msg.includes('429') ||
    msg.includes('500') ||
    msg.includes('Model Not Exist') ||
    msg.includes('Invalid API key') ||
    msg.includes('Incorrect API key') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  )
}

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

function extractJson(text: string): unknown {
  const s1 = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  const start = s1.indexOf('{')
  const end = s1.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(s1.slice(start, end + 1)) } catch {/* next */}
  }

  if (start !== -1 && end > start) {
    try {
      const fixed = s1.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1')
      return JSON.parse(fixed)
    } catch {/* next */}
  }

  throw new Error(`无法从模型输出中提取 JSON。\n原始输出前300字：\n${text.slice(0, 300)}`)
}

function mergeSchema(
  current: Partial<AIProjectSchema>,
  incoming: Partial<AIProjectSchema>,
  role: AgentRole
): Partial<AIProjectSchema> {
  switch (role) {
    case 'analyst':
      return {
        ...current,
        meta: incoming.meta ?? current.meta,
        requirements: incoming.requirements ?? current.requirements,
        components: incoming.components ?? current.components,
        functionalRoles: incoming.functionalRoles ?? current.functionalRoles,
      }
    case 'architect':
      return {
        ...current,
        interfacePlan: incoming.interfacePlan ?? current.interfacePlan,
        connectionPlan: incoming.connectionPlan ?? current.connectionPlan,
        connections: incoming.connections ?? current.connections,
      }
    case 'programmer':
      return { ...current, blocklyWorkspace: incoming.blocklyWorkspace ?? current.blocklyWorkspace }
  }
}

function roleSpecificFixPrompt(role: AgentRole, validation: SchemaValidationResult): string {
  const relevant = validation.issues.filter(issue => {
    if (role === 'analyst') return issue.category === 'requirements' || issue.category === 'roles'
    if (role === 'architect') return issue.category === 'interfaces' || issue.category === 'connections'
    return issue.category === 'blockly'
  })

  if (relevant.length === 0) return ''

  return [
    '',
    'Validation feedback you MUST fix in this retry:',
    ...relevant.map((issue, index) => `${index + 1}. [${issue.level.toUpperCase()}][${issue.category}] ${issue.message}`),
    'Update only your assigned fields and make them satisfy the validation feedback.',
  ].join('\n')
}

function createRetryReason(validation: SchemaValidationResult) {
  const first = validation.issues[0]?.message ?? '结构化校验未通过'
  return `结构化校验未通过（score=${validation.score}）：${first}`
}

function determineRetryRoles(validation: SchemaValidationResult): AgentRole[] {
  const categories = new Set(validation.issues.map(issue => issue.category))
  if (categories.has('requirements') || categories.has('roles')) return ['analyst', 'architect', 'programmer']
  if (categories.has('interfaces') || categories.has('connections')) return ['architect', 'programmer']
  if (categories.has('blockly')) return ['programmer']
  return ['architect', 'programmer']
}

function shouldAcceptValidation(validation: SchemaValidationResult) {
  return validation.ok && validation.score >= VALIDATION_PASS_SCORE
}

function ensureBaseSchema(): Partial<AIProjectSchema> {
  return {
    meta: undefined,
    requirements: {
      summary: '',
      coreFunctions: [],
      inputs: [],
      outputs: [],
      interactions: [],
      communication: [],
      power: [],
      constraints: [],
    },
    components: [],
    functionalRoles: [],
    interfacePlan: [],
    connectionPlan: [],
    connections: [],
    blocklyWorkspace: [],
  }
}

async function runAgent(
  config: ActiveModelConfig,
  role: AgentRole,
  userPrompt: string,
  schema: Partial<AIProjectSchema>,
  emit: PipelineEventHandler,
  attempt = 1,
  validation?: SchemaValidationResult
): Promise<{ schema: Partial<AIProjectSchema>; apiError?: string }> {
  const meta = AGENT_META[role]
  const t0 = Date.now()
  if (attempt === 1) emit({ type: 'agent_start', agent: role })

  let fullText = ''

  try {
    const retryNote = attempt > 1
      ? '\n\nIMPORTANT: Output ONLY raw JSON starting with { and ending with }. No other text.'
      : ''
    const validationNote = validation ? `\n\n${roleSpecificFixPrompt(role, validation)}` : ''
    const userMsg =
      `User requirement: ${userPrompt}\n\n` +
      `Current schema:\n${JSON.stringify(schema, null, 2)}\n\n` +
      `Output the updated complete JSON.${retryNote}${validationNote}`

    console.log(`[${role}] provider=${config.providerId} model=${config.modelId} baseUrl=${config.baseUrl}`)

    for await (const chunk of streamLLM(config, meta.systemPrompt, userMsg, 4096)) {
      if ('token' in chunk) {
        fullText += chunk.token
        if (attempt === 1) emit({ type: 'agent_token', agent: role, token: chunk.token })
      }
    }

    console.log(`[${role}] output (${fullText.length}chars):`, fullText.slice(0, 200))

    const parsed = extractJson(fullText) as Partial<AIProjectSchema>
    const updated = mergeSchema(schema, parsed, role)
    emit({ type: 'agent_done', agent: role, durationMs: Date.now() - t0 })
    return { schema: updated }
  } catch (err: any) {
    console.error(`[${role}] attempt ${attempt} error:`, err?.message ?? err)

    if (isApiError(err)) {
      const msg = friendlyError(err, config)
      emit({ type: 'agent_error', agent: role, error: msg })
      return { schema, apiError: msg }
    }

    if (attempt < 2) {
      emit({ type: 'agent_token', agent: role, token: '\n\n⟳ 正在重试...\n' })
      return runAgent(config, role, userPrompt, schema, emit, 2, validation)
    }

    const msg = `JSON 解析失败（已重试）：${err?.message ?? err}`
    emit({ type: 'agent_error', agent: role, error: msg })
    return { schema, apiError: msg }
  }
}

async function runRoles(
  roles: AgentRole[],
  config: ActiveModelConfig,
  userPrompt: string,
  schema: Partial<AIProjectSchema>,
  emit: PipelineEventHandler,
  validation?: SchemaValidationResult
): Promise<{ schema: Partial<AIProjectSchema>; apiError?: string; guardError?: string }> {
  let current = schema

  for (const role of roles) {
    const result = await runAgent(config, role, userPrompt, current, emit, 1, validation)

    if (result.apiError) {
      return { schema: current, apiError: result.apiError }
    }

    current = result.schema

    if (role === 'analyst') {
      const guard = validateAnalystOutput(current)
      if (!guard.ok) {
        const reason = guard.reason!
        emit({ type: 'agent_error', agent: 'analyst', error: reason })
        return { schema: current, guardError: reason }
      }
    }
  }

  return { schema: current }
}

export async function runPipelineWithGuard(
  userPrompt: string,
  config: ActiveModelConfig,
  emit: PipelineEventHandler
): Promise<AIProjectSchema | null> {
  if (!config.apiKey?.trim()) {
    const msg = `未设置 API Key。请点击右上角 ⚙ 模型配置，填写 ${config.providerId} 的 API Key 后保存。`
    emit({ type: 'pipeline_error', error: msg })
    return null
  }

  let schema = ensureBaseSchema()

  const firstPass = await runRoles(PIPELINE_ORDER, config, userPrompt, schema, emit)

  if (firstPass.apiError) {
    emit({ type: 'pipeline_error', error: firstPass.apiError })
    emitGuardFail(firstPass.apiError, ['architect', 'programmer'])
    return null
  }

  if (firstPass.guardError) {
    emit({ type: 'pipeline_error', error: firstPass.guardError })
    emitGuardFail(firstPass.guardError, ['architect', 'programmer'])
    return null
  }

  schema = firstPass.schema

  let normalized = normalizeConnections(schema as AIProjectSchema)
  let validation = validateProjectSchema(normalized)
  let retryCount = 0

  while (!shouldAcceptValidation(validation) && retryCount < MAX_VALIDATION_RETRIES) {
    retryCount += 1
    const retryRoles = determineRetryRoles(validation)
    const reason = createRetryReason(validation)

    emit({
      type: 'pipeline_retry',
      attempt: retryCount,
      reason,
      roles: retryRoles,
      validation,
    })

    const retried = await runRoles(retryRoles, config, userPrompt, schema, emit, validation)

    if (retried.apiError) {
      emit({ type: 'pipeline_error', error: retried.apiError })
      const downstream = PIPELINE_ORDER.filter(role => !retryRoles.includes(role))
      emitGuardFail(retried.apiError, downstream)
      return null
    }

    if (retried.guardError) {
      emit({ type: 'pipeline_error', error: retried.guardError })
      emitGuardFail(retried.guardError, ['architect', 'programmer'])
      return null
    }

    schema = retried.schema
    normalized = normalizeConnections(schema as AIProjectSchema)
    validation = validateProjectSchema(normalized)
  }

  if (!shouldAcceptValidation(validation)) {
    const finalReason = `自动校验重试后仍未闭环：score=${validation.score}，错误 ${validation.summary.errors}，警告 ${validation.summary.warnings}。`
    emit({ type: 'pipeline_error', error: finalReason })
    return null
  }

  emit({ type: 'pipeline_done', schema: normalized })
  return normalized
}
