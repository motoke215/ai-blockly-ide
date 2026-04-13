import mitt from 'mitt'
import type { AIProjectSchema } from './types/project.schema'
import type { SchemaValidationResult } from '../modules/ai-chat/schema-validator'

export type AgentRole = 'analyst' | 'architect' | 'programmer'

export interface LogLine {
  level: 'info' | 'warn' | 'error' | 'success' | 'system'
  text: string
  timestamp: number
}

export type BusEvents = {
  'pipeline:start':   { userPrompt: string }
  'pipeline:done':    { schema: AIProjectSchema }
  'pipeline:error':   { message: string }
  'pipeline:retry':   { attempt: number; reason: string; roles: AgentRole[]; validation: SchemaValidationResult }
  'pipeline:abort':   void
  'agent:start':      { role: AgentRole }
  'agent:token':      { role: AgentRole; token: string }
  'agent:done':       { role: AgentRole; durationMs: number }
  'agent:error':      { role: AgentRole; message: string }
  'agent:blocked':    { role: AgentRole }
  'guard:fail':       { message: string }
  'canvas:node-moved':{ componentId: string; position: { x: number; y: number } }
  'code:updated':     { arduinoCode: string; sketchName: string }
  'compile:log':      { line: LogLine }
  'compile:done':     { success: boolean; sizeKb?: number }
  'upload:done':      { success: boolean; port: string }
  'serial:line':      { text: string }
}

export const bus = mitt<BusEvents>()

export function emitGuardFail(message: string, blockedAgents: AgentRole[]): void {
  bus.emit('guard:fail', { message })
  bus.emit('pipeline:error', { message })
  for (const role of blockedAgents) bus.emit('agent:blocked', { role })
}
