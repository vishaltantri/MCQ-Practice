// End-to-end pipeline: bytes -> text -> MCQs -> BankRecord.
//
// Preferred path: Groq LLM extraction (needs a user-supplied API key from the
// upload screen). The LLM handles messy layouts — answers written inline after
// the last option, quirky key formats — that defeat the regex parser.
// Fallback: the deterministic parser (src/parser.ts), applied per-chunk, so a
// Groq failure only downgrades the chunk it affected, never the whole document.
//
// Page tags: pdf.js gives every line a source page; the LLM path estimates a
// question's page from the character offsets of its source text.

import { extractDocText } from './doctext'
import { extractChunk, chunkByLines, type LlmQuestion, type TextLine } from './groq'
import { parseQuestions, type ParseIssue } from './parser'
import { DEFAULT_MODEL } from './groq'
import type { BankRecord, OptionKey, Question } from './types'

export interface PipelineResult {
  bank: BankRecord
  pageCount: number
  mode: 'groq' | 'parser' | 'mixed'
  issues: ParseIssue[]
  warnings: string[]
}

export async function processDocument(
  data: ArrayBuffer,
  filename: string,
  apiKey: string | null,
  opts: { onProgress?: (msg: string) => void } = {}
): Promise<PipelineResult> {
  opts.onProgress?.('Extracting text…')
  const doc = await extractDocText(data, filename)
  const textLines: TextLine[] = doc.lineMap
    ? doc.lineMap.map((l) => ({ page: l.page, text: l.text }))
    : doc.text.split('\n').filter((t) => t.trim()).map((t, i) => ({ page: 1 + Math.floor(i / 45), text: t })) // docx: no real pages

  let questions: Question[]
  let mode: PipelineResult['mode']
  const issues: ParseIssue[] = []
  const warnings: string[] = []

  if (apiKey) {
    const chunks = chunkByLines(textLines)
    opts.onProgress?.(`Sending ${chunks.length} chunk(s) to Groq…`)
    questions = []
    let groqOk = 0
    let parserOk = 0
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        const llmQs = await extractChunk(apiKey, chunk.text, DEFAULT_MODEL)
        if (llmQs.length === 0) throw new Error('model returned no questions')
        // estimate source pages from the chunk's line range
        for (const q of llmQs) {
          questions.push(llmToQuestion(q, questions.length, estimatePage(q, chunk)))
        }
        groqOk++
        for (const iss of llmQs.flatMap((q) => q.issues)) {
          issues.push({ message: `LLM: ${iss}` })
        }
      } catch (e: any) {
        // Deterministic fallback for exactly this chunk.
        const { questions: qs, issues: iss } = parseQuestions(chunk.lines)
        for (const q of qs) {
          questions.push({ ...q, id: `q-${questions.length}`, bankIndex: questions.length })
        }
        parserOk++
        warnings.push(`Chunk ${i + 1} used the built-in parser: ${e?.message ?? e}`)
        issues.push(...iss)
      }
      opts.onProgress?.(`Processed ${i + 1} of ${chunks.length} chunks…`)
    }
    mode = groqOk > 0 && parserOk > 0 ? 'mixed' : parserOk > 0 && groqOk === 0 ? 'parser' : 'groq'
    if (mode === 'parser') {
      warnings.push('Groq was unavailable — the whole document was parsed with the built-in parser.')
    }
  } else {
    opts.onProgress?.('Parsing questions (built-in parser)…')
    const { questions: qs, issues: iss } = parseQuestions(textLines)
    questions = qs
    issues.push(...iss)
    mode = 'parser'
  }

  if (questions.length === 0) {
    throw new Error('No MCQs detected in this document. It may be scanned, in an unusual layout, or not contain multiple-choice questions.')
  }

  const now = Date.now()
  const bank: BankRecord = {
    id: `bank-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: filename.replace(/\.(pdf|docx)$/i, ''),
    createdAt: now,
    updatedAt: now,
    questions,
    answers: {},
    history: [],
    reviewedUpTo: 0,
    batchSize: 10,
  }
  return { bank, pageCount: doc.pageCount, mode, issues, warnings }
}

/** Estimate the printed source page of an LLM question by locating its text in the chunk's lines. */
function estimatePage(q: LlmQuestion, chunk: { lines: TextLine[] }): number {
  if (chunk.lines.length === 0) return 1
  const probe = q.text.slice(0, 60).toLowerCase()
  for (const l of chunk.lines) {
    if (l.text.toLowerCase().includes(probe.slice(0, 30))) return l.page
  }
  return chunk.lines[0].page
}

function llmToQuestion(q: LlmQuestion, bankIndex: number, page: number): Question {
  return {
    id: `q-${bankIndex}`,
    originalNumber: q.number ?? bankIndex + 1,
    bankIndex,
    text: q.text,
    options: q.options.map((o) => ({ key: o.key as OptionKey, text: o.text })),
    correctAnswer: q.correctAnswer,
    answerIssue: q.correctAnswer == null ? 'key-parse-failed' : null,
    sourcePage: page,
    sourcePageEnd: page,
  }
}
