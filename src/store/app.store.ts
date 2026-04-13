// src/store/app.store.ts
import { create }        from 'zustand'
import { immer }         from 'zustand/middleware/immer'
import { bus }           from '../shared/event-bus'
import type { AgentRole, LogLine } from '../shared/event-bus'
import type { AIProjectSchema }    from '../shared/types/project.schema'
import type { Node, Edge }         from 'reactflow'
import { schemaToFlow }  from '../modules/wiring/schema-to-flow'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'blocked'

export interface AgentSlice {
  status: AgentStatus; tokens: string; durationMs: number | null; error: string | null
}
const makeAgent = (): AgentSlice => ({ status: 'idle', tokens: '', durationMs: null, error: null })

export interface AppState {
  pipelineRunning: boolean
  guardError:      string | null
  agents:          Record<AgentRole, AgentSlice>
  schema:          AIProjectSchema | null
  nodes:           Node[]
  edges:           Edge[]
  arduinoCode:     string
  sketchName:      string
  compileLogs:     LogLine[]
  compileRunning:  boolean
  lastCompileOk:   boolean | null
  lastUploadOk:    boolean | null
  selectedPort:    string
  _wireSweep:      (() => void) | null
}

export interface AppActions {
  registerWireSweep: (fn: () => void) => void
  setSelectedPort:   (port: string) => void
  clearLogs:         () => void
  resetPipeline:     () => void
}

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => {

    // ── Bus subscriptions ────────────────────────────────────────────────
    bus.on('pipeline:start', () => {
      set(s => {
        s.pipelineRunning = true; s.guardError = null
        s.agents = { analyst: makeAgent(), architect: makeAgent(), programmer: makeAgent() }
        s.nodes = []; s.edges = []; s.schema = null; s.arduinoCode = ''
      })
    })

    bus.on('agent:start', ({ role }) => {
      set(s => { s.agents[role].status = 'running' })
    })

    bus.on('agent:token', ({ role, token }) => {
      set(s => { s.agents[role].tokens += token })
    })

    bus.on('agent:done', ({ role, durationMs }) => {
      set(s => { s.agents[role].status = 'done'; s.agents[role].durationMs = durationMs })
      // Architect done → trigger wire sweep
      if (role === 'architect') {
        setTimeout(() => { get()._wireSweep?.() }, 80)
      }
    })

    bus.on('agent:error', ({ role, message }) => {
      set(s => { s.agents[role].status = 'error'; s.agents[role].error = message })
    })

    bus.on('agent:blocked', ({ role }) => {
      set(s => { s.agents[role].status = 'blocked' })
    })

    bus.on('guard:fail', ({ message }) => {
      set(s => { s.guardError = message; s.pipelineRunning = false })
      console.error('%c[PIPELINE GUARD] 检测到受限请求\n%c' + message,
        'color:#f87171;font-weight:bold;font-size:13px;', 'color:#fca5a5;')
    })

    bus.on('pipeline:done', ({ schema }) => {
      set(s => {
        s.schema = schema; s.pipelineRunning = false
        s.sketchName = schema.meta.name.replace(/\s+/g, '_')
        // Convert schema to ReactFlow nodes & edges
        const { nodes, edges } = schemaToFlow(schema)
        s.nodes = nodes; s.edges = edges
      })
    })

    bus.on('pipeline:error', () => {
      set(s => { s.pipelineRunning = false })
    })

    bus.on('pipeline:abort', () => {
      set(s => {
        s.pipelineRunning = false
        ;(['analyst', 'architect', 'programmer'] as AgentRole[]).forEach(r => {
          if (s.agents[r].status === 'running') s.agents[r].status = 'idle'
        })
      })
    })

    bus.on('canvas:node-moved', ({ componentId, position }) => {
      set(s => {
        const node = s.nodes.find(n => n.id === componentId)
        if (node) node.position = position
        if (s.schema) {
          const comp = s.schema.components.find(c => c.id === componentId)
          if (comp) comp.position = position
        }
      })
    })

    bus.on('code:updated', ({ arduinoCode, sketchName }) => {
      set(s => { s.arduinoCode = arduinoCode; s.sketchName = sketchName })
    })

    bus.on('compile:log', ({ line }) => {
      set(s => {
        if (s.compileLogs.length > 500) s.compileLogs.shift()
        s.compileLogs.push(line); s.compileRunning = true
      })
    })

    bus.on('compile:done', ({ success }) => {
      set(s => { s.compileRunning = false; s.lastCompileOk = success })
    })

    bus.on('upload:done', ({ success }) => {
      set(s => { s.lastUploadOk = success })
    })

    return {
      pipelineRunning: false, guardError: null,
      agents: { analyst: makeAgent(), architect: makeAgent(), programmer: makeAgent() },
      schema: null, nodes: [], edges: [],
      arduinoCode: '', sketchName: 'untitled',
      compileLogs: [], compileRunning: false,
      lastCompileOk: null, lastUploadOk: null, selectedPort: '',
      _wireSweep: null,

      registerWireSweep: (fn) => set(s => { s._wireSweep = fn }),
      setSelectedPort:   (p)  => set(s => { s.selectedPort = p }),
      clearLogs:         ()   => set(s => { s.compileLogs = [] }),
      resetPipeline:     ()   => set(s => {
        s.pipelineRunning = false; s.guardError = null
        s.agents = { analyst: makeAgent(), architect: makeAgent(), programmer: makeAgent() }
        s.nodes = []; s.edges = []; s.schema = null
      }),
    }
  })
)
