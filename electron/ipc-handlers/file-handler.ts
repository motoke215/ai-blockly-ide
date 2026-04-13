// electron/ipc-handlers/file-handler.ts
import { ipcMain, dialog, type BrowserWindow } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

export const FILE_IPC = {
  SHOW_OPEN_DIALOG: 'file:show-open-dialog',
  SHOW_SAVE_DIALOG: 'file:show-save-dialog',
  READ_FILE:        'file:read-file',
  WRITE_FILE:       'file:write-file',
} as const

export const FILE_FILTERS = {
  PDF:       { name: 'Product Documents',  extensions: ['pdf'] },
  TEXT:      { name: 'Text Files',         extensions: ['txt', 'md', 'markdown'] },
  JSON:      { name: 'JSON',               extensions: ['json'] },
  CSV:       { name: 'CSV',                extensions: ['csv'] },
  IMAGE:     { name: 'Images',             extensions: ['png', 'jpg', 'jpeg'] },
  KICAD:     { name: 'KiCad Files',        extensions: ['kicad_sch', 'kicad_pcb'] },
  PROJECT:   { name: 'AI-Blockly Project',  extensions: ['aiprj'] },
  ALL:       { name: 'All Files',           extensions: ['*'] },
} as const

export function registerFileHandlers(win: BrowserWindow): void {
  // Show open dialog — returns { canceled, filePaths }
  ipcMain.handle(FILE_IPC.SHOW_OPEN_DIALOG, async (_, opts: {
    filters?: { name: string; extensions: string[] }[]
    multiSelect?: boolean
    title?: string
  }) => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title:         opts.title ?? 'Open File',
        filters:       opts.filters ?? [FILE_FILTERS.ALL],
        properties:    opts.multiSelect
          ? ['openFile', 'multiSelections'] as const
          : ['openFile'] as const,
      })
      return { ok: true, canceled: result.canceled, filePaths: result.filePaths }
    } catch (e: any) {
      return { ok: false, canceled: true, filePaths: [], error: e?.message }
    }
  })

  // Show save dialog — returns { canceled, filePath }
  ipcMain.handle(FILE_IPC.SHOW_SAVE_DIALOG, async (_, opts: {
    filters?: { name: string; extensions: string[] }[]
    defaultPath?: string
    title?: string
  }) => {
    try {
      const result = await dialog.showSaveDialog(win, {
        title:        opts.title ?? 'Save File',
        filters:      opts.filters ?? [FILE_FILTERS.ALL],
        defaultPath:  opts.defaultPath,
      })
      return { ok: true, canceled: result.canceled, filePath: result.filePath }
    } catch (e: any) {
      return { ok: false, canceled: true, filePath: undefined, error: e?.message }
    }
  })

  // Read file — returns { ok, data?, error? }
  ipcMain.handle(FILE_IPC.READ_FILE, async (_, filePath: string) => {
    try {
      // Security: ensure path is a file (not directory traversal)
      const stat = await fs.stat(filePath)
      if (!stat.isFile()) {
        return { ok: false, error: 'Path is not a file' }
      }
      const data = await fs.readFile(filePath, 'utf-8')
      return { ok: true, data }
    } catch (e: any) {
      return { ok: false, error: e?.message }
    }
  })

  // Write file — returns { ok, error? }
  ipcMain.handle(FILE_IPC.WRITE_FILE, async (_, filePath: string, content: string) => {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e?.message }
    }
  })
}
