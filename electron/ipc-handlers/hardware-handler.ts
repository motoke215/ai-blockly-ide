// electron/ipc-handlers/hardware-handler.ts
import { ipcMain, type BrowserWindow } from 'electron'
import { arduinoService } from '../mcp-server/tools/arduino-cli'
import { serialService }  from '../mcp-server/tools/serial-port'

export const IPC = {
  COMPILE_UPLOAD: 'hw:compile-upload', LIST_BOARDS: 'hw:list-boards',
  ABORT: 'hw:abort', GET_VERSION: 'hw:get-version', ENSURE_CORE: 'hw:ensure-core',
  SERIAL_OPEN: 'serial:open', SERIAL_CLOSE: 'serial:close',
  SERIAL_WRITE: 'serial:write', SERIAL_LIST: 'serial:list',
  ARDUINO_EVENT: 'hw:event', SERIAL_DATA: 'serial:data',
} as const

export function registerHardwareHandlers(win: BrowserWindow): void {
  const send = (ch: string, data: unknown) => { if (!win.isDestroyed()) win.webContents.send(ch, data) }

  arduinoService.on('event', (evt: any) => send(IPC.ARDUINO_EVENT, evt))
  serialService.on('data', (line: string) => send(IPC.SERIAL_DATA, { line }))

  ipcMain.handle(IPC.COMPILE_UPLOAD, async (_, opts) => {
    try {
      const ok = await arduinoService.ensureCore(opts.board)
      if (!ok) return { ok: false, error: `Failed to install core for ${opts.board}` }
      const result = await arduinoService.compileAndUpload(opts)
      return { ok: true, result }
    } catch (e: any) { return { ok: false, error: e?.message } }
  })

  ipcMain.handle(IPC.LIST_BOARDS, async () => {
    try { return { ok: true, boards: await arduinoService.listBoards() } }
    catch (e: any) { return { ok: false, boards: [], error: e?.message } }
  })

  ipcMain.handle(IPC.ABORT,       () => { arduinoService.abort(); return { ok: true } })
  ipcMain.handle(IPC.GET_VERSION, async () => {
    const v = await arduinoService.getVersion()
    return { ok: v !== null, version: v }
  })
  ipcMain.handle(IPC.ENSURE_CORE, async (_, board) => ({ ok: await arduinoService.ensureCore(board) }))

  ipcMain.handle(IPC.SERIAL_OPEN,  async (_, { port, baudRate }) => {
    try { await serialService.open(port, baudRate); return { ok: true } }
    catch (e: any) { return { ok: false, error: e?.message } }
  })
  ipcMain.handle(IPC.SERIAL_CLOSE, async () => { await serialService.close(); return { ok: true } })
  ipcMain.handle(IPC.SERIAL_WRITE, async (_, data) => {
    try { await serialService.write(data); return { ok: true } }
    catch (e: any) { return { ok: false, error: e?.message } }
  })
  ipcMain.handle(IPC.SERIAL_LIST,  async () => {
    const ports = await serialService.listPorts()
    return { ok: true, ports }
  })
}
