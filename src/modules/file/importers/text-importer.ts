// src/modules/file/importers/text-importer.ts
export async function extractTextFromFile(file: File): Promise<string> {
  return file.text()
}

export function extractTextFromContent(content: string, filename: string): string {
  return content
}
