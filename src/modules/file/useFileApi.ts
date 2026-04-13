// src/modules/file/useFileApi.ts
import type { OpenDialogOptions, SaveDialogOptions, OpenDialogResult, SaveDialogResult, ReadResult, WriteResult } from '../../shared/types/file-api'

export function useFileApi() {
  return {
    showOpenDialog: (opts: OpenDialogOptions): Promise<OpenDialogResult> =>
      (window as any).file.showOpenDialog(opts),

    showSaveDialog: (opts: SaveDialogOptions): Promise<SaveDialogResult> =>
      (window as any).file.showSaveDialog(opts),

    readFile: (path: string): Promise<ReadResult> =>
      (window as any).file.readFile(path),

    writeFile: (path: string, content: string): Promise<WriteResult> =>
      (window as any).file.writeFile(path, content),
  }
}
