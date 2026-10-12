// Groq LLM extraction — runs fully client-side.
//
// The user supplies their own Groq API key at upload time; the key is used
// only for browser fetch() calls to api.groq.com and is stored in
// localStorage so repeat uploads don't re-enter it. It is never bundled.
//
// Safety net: if the LLM can't be reached or a response can't be validated,
// the caller can fall back to the deterministic parser for that chunk.

import type { OptionKey } from './types'

export interface RawLlmQuestion {
  number: number | null // question number as printed, if found
  text: string
  options: Array<{ key: string; text: string }>
  answer: string | null // letter, as requested in the prompt
}

export interface LlmQuestion {
  number: number | null
  text: string
  options: Array<{ key: OptionKey; text: string }>
  correctAnswer: OptionKey | null
  issues: string[] // validation notes; empty = clean
}

export const DEFAULT_MODEL = 'openai/gpt-oss-20b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// ---------- API key management (localStorage) ----------

const KEY_STORAGE = 'groq-api-key'
export function getStoredKey(): string | null {
  try { return localStorage.getItem(KEY_STORAGE) } catch { return null }
}
export function storeKey(key: string) {
  try { localStorage.setItem(KEY_STORAGE, key.trim()) } catch { /* private mode */ }
}
export function clearStoredKey() {
  try { localStorage.removeItem(KEY_STORAGE) } catch { /* noop */ }
}

// ---------- Normalisation + validation ----------

const VALID_KEYS: OptionKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function normaliseKey(k: string): OptionKey | null {
  const s = String(k ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '') // strip "(", ".", spaces…
  if (s.length === 1 && VALID_KEYS.includes(s as OptionKey)) return s as OptionKey
  const m = /^(?:OPT(?:ION)?)?([A-H])$/.exec(s) // "OPTION C", "OPTC" → C
  return m ? (m[1] as OptionKey) : null
}

/** Coerce one raw LLM object into a validated LlmQuestion. Returns issues; ok = no fatal issues. */
export function normaliseQuestion(raw: RawLlmQuestion): { q: LlmQuestion | null; issues: string[] } {
  const issues: string[] = []
  const text = typeof raw?.text === 'string' ? raw.text.replace(/\s+/g, ' ').trim() : ''
  if (text.length < 3) return { q: null, issues: ['missing or too-short question text'] }

  const seen = new Set<string>()
  const options: Array<{ key: OptionKey; text: string }> = []
  let embedded: OptionKey | null = null
  for (const o of Array.isArray(raw?.options) ? raw.options : []) {
    const key = normaliseKey(o?.key)
    if (!key) { issues.push(`dropped option "${o?.key}" (unrecognised key)`); continue }
    if (seen.has(key)) { issues.push(`duplicate option ${key}`); continue }
    seen.add(key)
    let t = typeof o?.text === 'string' ? o.text.replace(/\s+/g, ' ').trim() : ''
    if (!t) { issues.push(`empty option ${key}`); continue }
    // Correct answer accidentally left inside the option text — split it out.
    const tail = /(?:\b(?:ans(?:wer)?|correct(?:\s+ans(?:wer)?)?)\s*[:\-–]+\s*|\bans\b\s*)\(?([A-Ha-h])\)?\s*\.?$/i.exec(t)
    if (tail) {
      t = t.slice(0, tail.index).replace(/[\s,.;]+$/, '').trim()
      embedded = normaliseKey(tail[1])
      if (embedded) {
        issues.push(`answer "${tail[1]}" was embedded at the end of option ${key} — separated automatically`)
      } else {
        t = `${t} ${tail[0].trim()}`.replace(/\s+/g, ' ').trim() // not a letter after all — restore text
      }
    }
    options.push({ key, text: t })
  }
  if (options.length < 2) return { q: null, issues: [...issues, 'fewer than 2 usable options'] }

  // Option-key sanity: letters should already be normalised; re-letter strictly sequential ones missing.
  let correct: OptionKey | null = normaliseKey(raw?.answer ?? '') ?? embedded
  if (correct && !options.some((o) => o.key === correct)) {
    issues.push(`answer "${correct}" has no matching option — treated as unknown`)
    correct = null
  }

  return {
    q: {
      number: typeof raw?.number === 'number' && Number.isFinite(raw.number) ? raw.number : null,
      text,
      options,
      correctAnswer: correct,
      issues,
    },
    issues,
  }
}

/** Convenience: validate without the normalisation step (tests). */
export function validateQuestion(q: LlmQuestion): { ok: boolean; issues: string[] } {
  if (!q.text || q.text.trim().length < 3) return { ok: false, issues: ['missing question text'] }
  if (q.options.length < 2) return { ok: false, issues: ['fewer than 2 options'] }
  const issues: string[] = []
  for (const o of q.options) {
    if (!VALID_KEYS.includes(o.key)) issues.push(`invalid option key ${o.key}`)
    if (!o.text.trim()) issues.push(`empty option ${o.key}`)
  }
  if (q.correctAnswer != null && !q.options.some((o) => o.key === q.correctAnswer)) {
    issues.push(`answer ${q.correctAnswer} has no matching option`)
  }
  return { ok: issues.length === 0, issues }
}

// ---------- Prompting ----------

const SYSTEM_PROMPT = `You are a meticulous exam-question extraction engine. You are given raw text extracted from a PDF or Word document that contains multiple-choice questions (MCQs). Segment it into individual MCQs and return strict JSON.

Rules:
- NEVER invent, complete, rewrite or paraphrase content. Preserve original wording exactly, minus page headers/footers/page numbers.
- Each question object: {"number": printed question number as integer or null, "text": question statement WITHOUT the number prefix and WITHOUT any options, "options": [{"key":"A","text":"..."}, ...], "answer": correct option letter as "A"/"B"/"C"/"D" or null}.
- "answer" must be the LETTER only, never the option text.
- CRITICAL: the correct answer is often written on the same line as the last option, e.g. "(D) Athens  Answer: C" or "(D) Rome Ans B". In that case the option text must be exactly the option's own text, and "Answer: X" must go ONLY in the "answer" field. Never keep "answer"/"Ans" inside an option's text.
- Normalise option keys to A, B, C, D (E, F... if more than 4). "a." "(a)" "1)" inside a question are option letters. Keep option text exactly as printed.
- If the text also contains a separate answer-key block (e.g. "ANSWER KEY 1. B 2. D"), use it to fill "answer" by matching printed question numbers.
- If a question has no discoverable answer, set "answer" to null. NEVER guess.
- Extract EVERY question in the text, in original order. Skip fragments with fewer than 2 options.
- Respond with ONLY a JSON object: {"questions":[...]} — no markdown, no commentary.`

// ---------- Chunking ----------

export interface TextLine {
  page: number
  text: string
}

export interface Chunk {
  text: string
  lines: TextLine[]
}

/**
 * Group extracted lines into chunks under ~24k characters, never splitting a
 * question: cuts always happen at a line that starts a new numbered question.
 */
export function chunkByLines(lines: TextLine[], maxChars = 24000): Chunk[] {
  const chunks: Chunk[] = []
  let cur: TextLine[] = []
  let curLen = 0
  const NUM_START = /^\d{1,4}[).:\-]\s/ // "12. A new question starts here"
  const flush = () => {
    if (cur.length) {
      chunks.push({ text: cur.map((l) => l.text).join('\n'), lines: cur })
      cur = []
      curLen = 0
    }
  }
  for (const line of lines) {
    const isBoundary = NUM_START.test(line.text)
    if (curLen + line.text.length + 1 > maxChars && cur.length > 0 && isBoundary) {
      flush()
    }
    cur.push(line)
    curLen += line.text.length + 1
  }
  flush()
  return chunks
}

// ---------- API call ----------

export class GroqError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string; type?: string }
}

async function callGroq(apiKey: string, text: string, model: string, signal?: AbortSignal): Promise<RawLlmQuestion[]> {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract the MCQs from this text:\n\n${text}` },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
    max_completion_tokens: 8000,
  }
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as ChatResponse
      if (err?.error?.message) msg = `${msg}: ${err.error.message}`
    } catch { /* non-JSON error body */ }
    throw new GroqError(msg, res.status)
  }
  const data = (await res.json()) as ChatResponse
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new GroqError('Empty response from Groq')
  return parseLlmJson(content)
}

function parseLlmJson(content: string): RawLlmQuestion[] {
  let raw: any
  try {
    raw = JSON.parse(content)
  } catch {
    // tolerate an accidental markdown fence around the JSON
    const m = content.match(/\{[\s\S]*\}/)
    if (!m) throw new GroqError('Response was not valid JSON')
    raw = JSON.parse(m[0])
  }
  const arr = Array.isArray(raw) ? raw : raw?.questions
  if (!Array.isArray(arr)) throw new GroqError('Response JSON had no "questions" array')
  return arr as RawLlmQuestion[]
}

// ---------- High-level extraction ----------

export interface GroqExtractionResult {
  questions: LlmQuestion[]
  chunks: number
  /** Human-readable failure reason per chunk that should fall back to the deterministic parser. */
  failedChunks: string[]
  model: string
  /** Validation separation notes (answer split out of option text etc.), for the issues box. */
  fixNotes: string[]
}

const MAX_RETRIES = 3

/**
 * Extract one chunk with retries. Throws GroqError after MAX_RETRIES so the
 * caller can fall back to the deterministic parser for exactly this chunk.
 */
export async function extractChunk(
  apiKey: string,
  text: string,
  model: string,
  signal?: AbortSignal
): Promise<LlmQuestion[]> {
  let lastErr: unknown = null
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const rawQs = await callGroq(apiKey, text, model, signal)
      const out: LlmQuestion[] = []
      for (const rq of rawQs) {
        const { q } = normaliseQuestion(rq)
        if (q) out.push(q)
      }
      return out
    } catch (e: any) {
      lastErr = e
      if (e instanceof GroqError && (e.status === 401 || e.status === 403)) throw e
      if (attempt < MAX_RETRIES - 1) await sleep(1500 * (attempt + 1))
    }
  }
  throw lastErr instanceof Error ? lastErr : new GroqError(String(lastErr))
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
