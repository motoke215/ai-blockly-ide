// src/modules/ai-chat/useQAMode.ts
// Q&A 答疑模式 Hook：订阅 pipeline 事件，维护实时上下文，支持流式问答
import { useEffect, useRef, useCallback, useState } from 'react'
import { bus } from '../../shared/event-bus'
import type { AgentRole, LogLine } from '../../shared/event-bus'
import type { AIProjectSchema } from '../../shared/types/project.schema'
import type { QAContext } from './qa-prompt'
import { buildQASystemPrompt, buildQAUserPrompt } from './qa-prompt'
import { streamLLM } from './llm-caller'
import type { ActiveModelConfig } from '../../shared/llm-providers'

export type QAPipelinePhase = 'idle' | 'analyst' | 'architect' | 'programmer' | 'done' | 'error'

export interface QATokens {
  onToken: (token: string) => void
  onDone: (totalTokens: number) => void
  onError: (err: string) => void
}

export function useQAMode(
  activeConfig: ActiveModelConfig | null,
): {
  qaContext: QAContext
  askQuestion: (question: string, tokens: QATokens) => () => void
  qaRunning: boolean
} {
  const [qaContext, setQaContext] = useState<QAContext>({
    pipelineRunning: false,
    pipelinePhase: 'idle',
    lastError: null,
    schema: null,
    arduinoCode: '',
    sketchName: 'untitled',
    compileRunning: false,
    compileLogs: [],
    lastCompileOk: null,
    lastUploadOk: null,
    agentDurations: {},
  })
  const [qaRunning, setQaRunning] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)

  // ── Subscribe to all relevant events, maintain context ────────────────────
  useEffect(() => {
    const onStart = () => {
      setQaContext(c => ({
        ...c,
        pipelineRunning: true,
        pipelinePhase: 'idle',
        lastError: null,
      }))
    }

    const onAgentStart = ({ role }: { role: AgentRole }) => {
      setQaContext(c => ({ ...c, pipelinePhase: role as QAPipelinePhase }))
    }

    const onAgentDone = ({ role, durationMs }: { role: AgentRole; durationMs: number }) => {
      setQaContext(c => ({
        ...c,
        agentDurations: { ...c.agentDurations, [role]: durationMs },
      }))
    }

    const onAgentError = ({ role, message }: { role: AgentRole; message: string }) => {
      setQaContext(c => ({
        ...c,
        pipelinePhase: 'error',
        pipelineRunning: false,
        lastError: `${role}: ${message}`,
      }))
    }

    const onPipelineDone = ({ schema }: { schema: AIProjectSchema }) => {
      setQaContext(c => ({
        ...c,
        schema,
        pipelineRunning: false,
        pipelinePhase: 'done',
        lastError: null,
      }))
    }

    const onPipelineError = ({ message }: { message: string }) => {
      setQaContext(c => ({
        ...c,
        pipelineRunning: false,
        pipelinePhase: 'error',
        lastError: message,
      }))
    }

    const onCodeUpdated = ({ arduinoCode, sketchName }: { arduinoCode: string; sketchName: string }) => {
      setQaContext(c => ({ ...c, arduinoCode, sketchName }))
    }

    const onCompileLog = ({ line }: { line: LogLine }) => {
      setQaContext(c => ({
        ...c,
        compileRunning: true,
        compileLogs: [...c.compileLogs.slice(-99), { level: line.level, text: line.text, ts: line.timestamp }],
      }))
    }

    const onCompileDone = ({ success }: { success: boolean }) => {
      setQaContext(c => ({ ...c, compileRunning: false, lastCompileOk: success }))
    }

    const onUploadDone = ({ success }: { success: boolean }) => {
      setQaContext(c => ({ ...c, lastUploadOk: success }))
    }

    bus.on('pipeline:start',    onStart)
    bus.on('agent:start',       onAgentStart)
    bus.on('agent:done',        onAgentDone)
    bus.on('agent:error',       onAgentError)
    bus.on('pipeline:done',      onPipelineDone)
    bus.on('pipeline:error',    onPipelineError)
    bus.on('code:updated',      onCodeUpdated)
    bus.on('compile:log',       onCompileLog)
    bus.on('compile:done',      onCompileDone)
    bus.on('upload:done',       onUploadDone)

    return () => {
      bus.off('pipeline:start',    onStart)
      bus.off('agent:start',       onAgentStart)
      bus.off('agent:done',        onAgentDone)
      bus.off('agent:error',       onAgentError)
      bus.off('pipeline:done',     onPipelineDone)
      bus.off('pipeline:error',    onPipelineError)
      bus.off('code:updated',      onCodeUpdated)
      bus.off('compile:log',       onCompileLog)
      bus.off('compile:done',      onCompileDone)
      bus.off('upload:done',       onUploadDone)
    }
  }, [])

  // ── Ask question ────────────────────────────────────────────────────────────
  const askQuestion = useCallback((question: string, tokens: QATokens): (() => void) => {
    if (!activeConfig?.apiKey) {
      tokens.onError('请先在模型配置中设置 API Key')
      return () => {}
    }

    setQaRunning(true)
    let aborted = false

    const systemPrompt = buildQASystemPrompt()
    const userPrompt = buildQAUserPrompt({ context: qaContext, question })

    const run = async () => {
      try {
        for await (const chunk of streamLLM(activeConfig, systemPrompt, userPrompt, 4096)) {
          if (aborted) break
          if ('token' in chunk) {
            tokens.onToken(chunk.token)
          } else {
            tokens.onDone(chunk.totalTokens)
          }
        }
      } catch (e: any) {
        if (!aborted) tokens.onError(e.message ?? '未知错误')
      } finally {
        if (!aborted) setQaRunning(false)
      }
    }

    run()

    return () => {
      aborted = true
      setQaRunning(false)
    }
  }, [activeConfig, qaContext])

  return { qaContext, askQuestion, qaRunning }
}
