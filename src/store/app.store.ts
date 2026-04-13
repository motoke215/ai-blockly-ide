// src/store/app.store.ts
import { create }        from 'zustand'
import { immer }         from 'zustand/middleware/immer'
import { bus }           from '../shared/event-bus'
import type { AgentRole, LogLine } from '../shared/event-bus'
import type { AIProjectSchema }    from '../shared/types/project.schema'
import type { Node, Edge }         from 'reactflow'
import { schemaToFlow }  from '../modules/wiring/schema-to-flow'
import { normalizeConnections } from '../modules/wiring/connection-normalizer'

export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'blocked'

export interface AgentSlice {
  status: AgentStatus; tokens: string; durationMs: number | null; error: string | null
}
const makeAgent = (): AgentSlice => ({ status: 'idle', tokens: '', durationMs: null, error: null })

function ensureSchemaShape(schema: AIProjectSchema): AIProjectSchema {
  return {
    meta: schema.meta,
    requirements: schema.requirements ?? {
      summary: '',
      coreFunctions: [],
      inputs: [],
      outputs: [],
      interactions: [],
      communication: [],
      power: [],
      constraints: [],
    },
    components: schema.components ?? [],
    functionalRoles: schema.functionalRoles ?? [],
    interfacePlan: schema.interfacePlan ?? [],
    connectionPlan: schema.connectionPlan ?? [],
    connections: schema.connections ?? [],
    blocklyWorkspace: schema.blocklyWorkspace ?? [],
  }
}

// ── History ────────────────────────────────────────────────────────────────
export interface HistoryEntry {
  id: string        // unique id (timestamp-based)
  name: string
  description: string
  targetBoard: string
  componentCount: number
  connectionCount: number
  timestamp: number
  compileOk: boolean | null
  schema: AIProjectSchema  // full schema for reloading
}

const HISTORY_KEY = 'ai-blockly-ide:history'
const MAX_HISTORY = 30

function loadHistory(): HistoryEntry[] {
  try {
    const entries = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as HistoryEntry[]
    return entries.map(entry => ({ ...entry, schema: ensureSchemaShape(entry.schema) }))
  } catch {
    return []
  }
}
function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

// ── State ─────────────────────────────────────────────────────────────────
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
  _canvas: {
    fitView: () => void
    toPng: (opts?: any) => Promise<string>
  } | null
  _bbCanvas: SVGSVGElement | null
  history: HistoryEntry[]
}

export interface AppActions {
  registerWireSweep: (fn: () => void) => void
  registerCanvas:    (canvas: { fitView: () => void; toPng: (opts?: any) => Promise<string> }) => void
  registerBBCanvas:  (el: SVGSVGElement) => void
  setSelectedPort:   (port: string) => void
  clearLogs:         () => void
  resetPipeline:     () => void
  addHistory:        (entry: Omit<HistoryEntry, 'id'>) => void
  clearHistory:      () => void
  loadFromHistory:   (id: string) => void
}

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => {

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
      const normalizedSchema = ensureSchemaShape(normalizeConnections(schema))
      const entry: Omit<HistoryEntry, 'id'> = {
        name: normalizedSchema.meta.name,
        description: normalizedSchema.meta.description,
        targetBoard: normalizedSchema.meta.targetBoard,
        componentCount: normalizedSchema.components.length,
        connectionCount: normalizedSchema.connections.length,
        timestamp: Date.now(),
        compileOk: null,
        schema: normalizedSchema,
      }
      set(s => {
        s.schema = normalizedSchema; s.pipelineRunning = false
        s.sketchName = normalizedSchema.meta.name.replace(/\s+/g, '_')
        const { nodes, edges } = schemaToFlow(normalizedSchema)
        s.nodes = nodes; s.edges = edges
      })
      setTimeout(() => { get().addHistory(entry) }, 100)
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
      set(s => {
        s.compileRunning = false
        s.lastCompileOk = success
        if (s.schema && s.history.length > 0) {
          const latest = s.history[0]
          if (latest?.schema.meta.id === s.schema.meta.id) {
            latest.compileOk = success
            saveHistory(s.history)
          }
        }
      })
    })

    bus.on('upload:done', ({ success }) => {
      set(s => { s.lastUploadOk = success })
    })

    const initialHistory = loadHistory()

    return {
      pipelineRunning: false, guardError: null,
      agents: { analyst: makeAgent(), architect: makeAgent(), programmer: makeAgent() },
      schema: null, nodes: [], edges: [],
      arduinoCode: '', sketchName: 'untitled',
      compileLogs: [], compileRunning: false,
      lastCompileOk: null, lastUploadOk: null, selectedPort: '',
      _wireSweep: null,
      _canvas: null,
      _bbCanvas: null,
      history: initialHistory,

      registerWireSweep: (fn) => set(s => { s._wireSweep = fn }),
      registerCanvas: (canvas) => set(s => { s._canvas = canvas }),
      registerBBCanvas: (el) => set(s => { s._bbCanvas = el }),
      setSelectedPort:   (p)  => set(s => { s.selectedPort = p }),
      clearLogs:         ()   => set(s => { s.compileLogs = [] }),
      resetPipeline:     ()   => set(s => {
        s.pipelineRunning = false; s.guardError = null
        s.agents = { analyst: makeAgent(), architect: makeAgent(), programmer: makeAgent() }
        s.nodes = []; s.edges = []; s.schema = null
      }),

      addHistory: (entry) => set(s => {
        const full: HistoryEntry = { ...entry, id: `hist_${Date.now()}_${Math.random().toString(36).slice(2,7)}` }
        s.history = [full, ...s.history].slice(0, MAX_HISTORY)
        saveHistory(s.history)
      }),

      clearHistory: () => set(s => { s.history = []; saveHistory([]) }),

      loadFromHistory: (id) => {
        const entry = get().history.find(h => h.id === id)
        if (!entry) return
        const normalizedSchema = ensureSchemaShape(normalizeConnections(entry.schema))
        const { nodes, edges } = schemaToFlow(normalizedSchema)
        set(s => {
          s.schema = normalizedSchema
          s.nodes = nodes
          s.edges = edges
          s.arduinoCode = ''
          s.sketchName = normalizedSchema.meta.name.replace(/\s+/g, '_')
          s.lastCompileOk = entry.compileOk
        })
      },
    }
  })
)
