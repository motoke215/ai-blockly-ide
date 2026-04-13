// src/modules/file/importers/pdf-importer.ts
import * as pdfjsLib from 'pdfjs-dist'

// Use the legacy build for simpler API (no worker needed for basic text extraction)
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let allText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
    allText += pageText + '\n\n'
  }

  return allText.trim()
}
