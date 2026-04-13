// src/modules/hardware/useArduinoCli.ts
import { useCallback, useEffect, useReducer } from 'react'
import { bus } from '../../shared/event-bus'
import type { LogLine } from '../../shared/event-bus'

interface HwState {
  isRunning: boolean; phase: 'idle'|'compile'|'upload'|'done'|'error'; progress: number
  logs: LogLine[]; cliVersion: string|null; lastCompileOk: boolean|null; lastUploadOk: boolean|null
  boards: string[]
}
type HwAction =
  | { type:'START' } | { type:'DONE' } | { type:'ERROR' }
  | { type:'PROGRESS'; pct: number; phase: 'compile'|'upload' }
  | { type:'LOG'; line: LogLine }
  | { type:'VERSION'; v: string|null }
  | { type:'BOARDS'; ports: string[] }
  | { type:'COMPILE_DONE'; ok: boolean }
  | { type:'UPLOAD_DONE'; ok: boolean }
  | { type:'CLEAR_LOGS' }

function hwReducer(s: HwState, a: HwAction): HwState {
  switch (a.type) {
    case 'START':        return { ...s, isRunning: true, phase: 'compile', progress: 0 }
    case 'DONE':         return { ...s, isRunning: false, phase: 'done', progress: 100 }
    case 'ERROR':        return { ...s, isRunning: false, phase: 'error' }
    case 'PROGRESS':     return { ...s, phase: a.phase, progress: a.pct }
    case 'LOG':          return { ...s, logs: [...s.logs.slice(-499), a.line] }
    case 'VERSION':      return { ...s, cliVersion: a.v }
    case 'BOARDS':       return { ...s, boards: a.ports }
    case 'COMPILE_DONE': return { ...s, lastCompileOk: a.ok }
    case 'UPLOAD_DONE':  return { ...s, isRunning: false, phase: a.ok ? 'done' : 'error', lastUploadOk: a.ok }
    case 'CLEAR_LOGS':   return { ...s, logs: [] }
    default:             return s
  }
}

const INIT: HwState = { isRunning: false, phase: 'idle', progress: 0, logs: [], cliVersion: null, lastCompileOk: null, lastUploadOk: null, boards: [] }
const hw = () => (window as any).hardware

export function useArduinoCli() {
  const [state, dispatch] = useReducer(hwReducer, INIT)

  useEffect(() => {
    hw().getVersion().then((r: any) => dispatch({ type: 'VERSION', v: r.version }))
    const unsub = hw().onArduinoEvent((evt: any) => {
      switch (evt.type) {
        case 'log':          dispatch({ type: 'LOG', line: evt.data }); bus.emit('compile:log', { line: evt.data }); break
        case 'progress':     dispatch({ type: 'PROGRESS', pct: evt.data.percent, phase: evt.data.phase }); break
        case 'compile_done': dispatch({ type: 'COMPILE_DONE', ok: evt.data.success }); bus.emit('compile:done', { success: evt.data.success }); break
        case 'upload_done':  dispatch({ type: 'UPLOAD_DONE',  ok: evt.data.success }); bus.emit('upload:done',  { success: evt.data.success, port: evt.data.port }); break
      }
    })
    return unsub
  }, [])

  const compile = useCallback(async (opts: { sketchName: string; sourceCode: string; board: string; port?: string }) => {
    dispatch({ type: 'START' })
    const r = await hw().compileUpload(opts)
    if (!r.ok) dispatch({ type: 'ERROR' })
    else dispatch({ type: 'DONE' })
  }, [])

  const refreshBoards = useCallback(async () => {
    const r = await hw().serialList()
    dispatch({ type: 'BOARDS', ports: r.ports || [] })
    return r.ports || []
  }, [])

  const abort = useCallback(() => { hw().abort(); dispatch({ type: 'ERROR' }) }, [])
  const clearLogs = useCallback(() => dispatch({ type: 'CLEAR_LOGS' }), [])

  return { ...state, isCliAvailable: state.cliVersion !== null, compile, refreshBoards, abort, clearLogs }
}
