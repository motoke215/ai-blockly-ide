// src/shared/types/file-api.ts

export interface FileFilter { name: string; extensions: string[] }

export interface OpenDialogOptions {
  filters?:     FileFilter[]
  multiSelect?: boolean
  title?:       string
}

export interface SaveDialogOptions {
  filters?:     FileFilter[]
  defaultPath?: string
  title?:       string
}

export interface OpenDialogResult {
  ok:       boolean
  canceled:  boolean
  filePaths?: string[]
  error?:    string
}

export interface SaveDialogResult {
  ok:       boolean
  canceled:  boolean
  filePath?: string
  error?:    string
}

export interface ReadResult {
  ok:    boolean
  data?: string
  error?: string
}

export interface WriteResult {
  ok:    boolean
  error?: string
}

export interface FileApi {
  showOpenDialog: (opts: OpenDialogOptions) => Promise<OpenDialogResult>
  showSaveDialog: (opts: SaveDialogOptions) => Promise<SaveDialogResult>
  readFile:        (path: string) => Promise<ReadResult>
  writeFile:       (path: string, content: string) => Promise<WriteResult>
}

declare global {
  interface Window {
    file?: FileApi
  }
}
