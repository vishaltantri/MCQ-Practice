// Document text extraction for the upload pipeline.
// - PDFs: existing pdf.js extraction (src/extract.ts), producing page-tagged lines.
// - Word (.docx): mammoth extracts paragraphs as one text blob.
//
// The pipeline prefers the Groq LLM path when an API key is available
// (better handling of messy layouts, answers inline after the last option);
// otherwise it falls back to the deterministic regex parser.

import { extractPdfLines, type PdfLine } from './extract'

export interface DocText {
  /** Plain text in reading order. */
  text: string
  pageCount: number
  kind: 'pdf' | 'docx'
  /** Page tag per character offset in `text` (PDF only; used for source pages). */
  lineMap?: PdfLine[]
}

export async function extractDocText(data: ArrayBuffer, filename: string): Promise<DocText> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser')
    const { value } = await mammoth.extractRawText({ arrayBuffer: data })
    return { text: String(value ?? ''), pageCount: 1, kind: 'docx' }
  }
  // PDF path (default; validated by the caller before reaching here)
  const { lines, pageCount, hasText } = await extractPdfLines(data)
  if (!hasText) {
    throw Object.assign(new Error('SCANNED'), { scannedPdf: true })
  }
  const text = lines.map((l) => l.text).join('\n')
  return { text, pageCount, kind: 'pdf', lineMap: lines }
}
