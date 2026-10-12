// PDF text extraction via pdf.js, runnable in both browser and Node (for tests).
// Produces Line objects tagged with their source page, so the parser can reason
// about layout and page boundaries.

export interface PdfLine {
  page: number // 1-based
  text: string
  x: number // left margin in CSS px (for column/indent heuristics)
  fontHeight: number
}

export interface ExtractedPdf {
  lines: PdfLine[]
  pageCount: number
  hasText: boolean
}

export interface Progress {
  (done: number, total: number, stage: string): void
}

// pdf.js is imported lazily so the module can also load in Node (tests).
let pdfjs: any = null
async function loadPdfjs() {
  if (pdfjs) return pdfjs
  // pdf.js 6.x relies on Uint8Array.toHex/fromHex (Chromium >= 140). Polyfill for older browsers.
  if (typeof Uint8Array !== 'undefined' && typeof (Uint8Array.prototype as any).toHex !== 'function') {
    (Uint8Array.prototype as any).toHex = function (this: Uint8Array) {
      return Array.from(this, (b) => b.toString(16).padStart(2, '0')).join('')
    }
  }
  // @ts-ignore - Vite-specific worker import
  if (typeof document !== 'undefined') {
    const lib: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default
    lib.GlobalWorkerOptions.workerSrc = workerUrl
    pdfjs = lib
  } else {
    pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  }
  return pdfjs
}

export async function extractPdfLines(
  data: ArrayBuffer | Uint8Array,
  onProgress?: Progress
): Promise<ExtractedPdf> {
  const lib = await loadPdfjs()
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const doc = await lib.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: false }).promise
  const pageCount = doc.numPages
  const lines: PdfLine[] = []
  let totalChars = 0
  for (let p = 1; p <= pageCount; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    // Group items into lines by Y coordinate, then sort within line by X.
    type Item = { str: string; x: number; y: number; h: number }
    const items: Item[] = []
    for (const it of tc.items as any[]) {
      if (typeof it.str !== 'string') continue
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], h: Math.hypot(it.transform[1], it.transform[0]) })
    }
    // cluster by y
    const clusters: Item[][] = []
    for (const item of items) {
      const target = clusters.find((c) => Math.abs(c[0].y - item.y) < 3)
      if (target) target.push(item)
      else clusters.push([item])
    }
    clusters.sort((a, b) => b[0].y - a[0].y) // top to bottom
    for (const cluster of clusters) {
      cluster.sort((a, b) => a.x - b.x)
      // join with spacing inferred from gaps
      let text = ''
      let prevEnd = null
      for (const item of cluster) {
        if (prevEnd !== null && item.x - prevEnd > 0.4 * Math.max(6, cluster[0].h)) {
          text += ' '
        }
        text += item.str
        prevEnd = item.x + item.str.length * 0
        // pdf.js does not give glyph widths here; use str length heuristic via width property if present
        if (typeof item === 'object') {
          const w = (item as any).width
          if (typeof w === 'number') prevEnd = item.x + w
        }
      }
      text = text.replace(/\s+/g, ' ').trim()
      if (!text) continue
      totalChars += text.length
      lines.push({ page: p, text, x: cluster[0].x, fontHeight: cluster[0].h })
    }
    page.cleanup()
    onProgress?.(p, pageCount, 'Extracting text from PDF')
  }
  const hasText = totalChars > 20 * pageCount // ratio heuristic; scanned PDFs yield ~0
  return { lines, pageCount, hasText }
}
