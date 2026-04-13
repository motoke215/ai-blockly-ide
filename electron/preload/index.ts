// electron/preload/index.ts
// Standalone preload - does NOT import from main process handlers
import { contextBridge, ipcRenderer } from 'electron';

// ── IPC Channel Constants (duplicated to avoid main-process imports) ────────────
const STORE_IPC = {
  GET_KEYS: 'store:get-keys',
  SET_KEY: 'store:set-key',
  DELETE_KEY: 'store:delete-key',
  GET_BASE_URLS: 'store:get-base-urls',
  SET_BASE_URL: 'store:set-base-url',
  GET_SELECTED_PROVIDER: 'store:get-selected-provider',
  SET_SELECTED_PROVIDER: 'store:set-selected-provider',
  GET_SELECTED_MODELS: 'store:get-selected-models',
  SET_SELECTED_MODEL: 'store:set-selected-model',
  GET_SUMMARY: 'store:get-summary',
} as const

const IPC = {
  COMPILE_UPLOAD: 'hw:compile-upload',
  LIST_BOARDS: 'hw:list-boards',
  ABORT: 'hw:abort',
  GET_VERSION: 'hw:get-version',
  ENSURE_CORE: 'hw:ensure-core',
  SERIAL_OPEN: 'serial:open',
  SERIAL_CLOSE: 'serial:close',
  SERIAL_WRITE: 'serial:write',
  SERIAL_LIST: 'serial:list',
  ARDUINO_EVENT: 'hw:event',
  SERIAL_DATA: 'serial:data',
} as const

// ── Store API (key persistence) ─────────────────────────────────────────────────
const storeAPI = {
  getKeys: () => ipcRenderer.invoke(STORE_IPC.GET_KEYS),
  setKey: (id: string, key: string) => ipcRenderer.invoke(STORE_IPC.SET_KEY, id, key),
  deleteKey: (id: string) => ipcRenderer.invoke(STORE_IPC.DELETE_KEY, id),
  getBaseUrls: () => ipcRenderer.invoke(STORE_IPC.GET_BASE_URLS),
  setBaseUrl: (id: string, url: string) => ipcRenderer.invoke(STORE_IPC.SET_BASE_URL, id, url),
  getSelectedProvider: () => ipcRenderer.invoke(STORE_IPC.GET_SELECTED_PROVIDER),
  setSelectedProvider: (id: string) => ipcRenderer.invoke(STORE_IPC.SET_SELECTED_PROVIDER, id),
  getSelectedModels: () => ipcRenderer.invoke(STORE_IPC.GET_SELECTED_MODELS),
  setSelectedModel: (pid: string, mid: string) => ipcRenderer.invoke(STORE_IPC.SET_SELECTED_MODEL, pid, mid),
  getSummary: () => ipcRenderer.invoke(STORE_IPC.GET_SUMMARY),
}

// ── Hardware API ───────────────────────────────────────────────────────────────
const hardwareAPI = {
  compileUpload: (opts: any) => ipcRenderer.invoke(IPC.COMPILE_UPLOAD, opts),
  listBoards: () => ipcRenderer.invoke(IPC.LIST_BOARDS),
  abort: () => ipcRenderer.invoke(IPC.ABORT),
  getVersion: () => ipcRenderer.invoke(IPC.GET_VERSION),
  serialOpen: (p: string, b: number) => ipcRenderer.invoke(IPC.SERIAL_OPEN, { port: p, baudRate: b }),
  serialClose: () => ipcRenderer.invoke(IPC.SERIAL_CLOSE),
  serialWrite: (d: string) => ipcRenderer.invoke(IPC.SERIAL_WRITE, d),
  serialList: () => ipcRenderer.invoke(IPC.SERIAL_LIST),
  onArduinoEvent: (cb: (e: any) => void) => {
    const h = (_: any, e: any) => cb(e)
    ipcRenderer.on(IPC.ARDUINO_EVENT, h)
    return () => ipcRenderer.off(IPC.ARDUINO_EVENT, h)
  },
  onSerialData: (cb: (line: string) => void) => {
    const h = (_: any, p: any) => cb(p.line)
    ipcRenderer.on(IPC.SERIAL_DATA, h)
    return () => ipcRenderer.off(IPC.SERIAL_DATA, h)
  },
}

contextBridge.exposeInMainWorld('store', storeAPI)
contextBridge.exposeInMainWorld('hardware', hardwareAPI)

// ── Updater API ────────────────────────────────────────────────────────────────
const updaterAPI = {
  check:    () => ipcRenderer.invoke('updater:check'),
  download: () => ipcRenderer.invoke('updater:download'),
  install:  () => ipcRenderer.invoke('updater:install'),
  onStatus: (cb: (msg: { status: string; data?: any; ts: number }) => void) => {
    const h = (_: any, m: any) => cb(m)
    ipcRenderer.on('updater:status', h)
    return () => ipcRenderer.off('updater:status', h)
  },
}
contextBridge.exposeInMainWorld('updater', updaterAPI)
