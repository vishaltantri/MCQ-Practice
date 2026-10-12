// Deterministic MCQ parser.
//
// Input: reconstructed lines from extract.ts (each tagged with page number).
// Output: Question[] with statements, options, and answer keys **only when
// reliably identifiable**. Answers are never guessed.
//
// Supported key formats:
//  - per-question key line: "Ans: C" / "Answer: C" after options
//  - inline trailing key on the last option line: "... blah ANSWER: C"
//  - "1. C"-style numbered entries when the current question already has options
//  - end-of-document key block: "ANSWER KEY" header, then "1. B" entries
//
// Anything ambiguous is left with correctAnswer = null for the user to fix/confirm.

import type { McqOption, OptionKey, Question } from './types'
import { OPTION_KEYS } from './types'

export interface ParseIssue {
  message: string
  questionIndex?: number
}

export interface ParseOutput {
  questions: Question[]
  issues: ParseIssue[]
}

const OPT_RE = /^(?:\(([A-Ha-h])\)|([A-Ha-h]))[).:\-]?\s+(.*)$/ // "(A) foo" | "A. foo" | "A) foo" (separator optional for the parenthesised form)
const NUM_RE = /^(\d{1,4})[).:\-]\s*(.+)$/ // "1. foo" | "1) foo" | "1: foo" | "1- foo"
const ANS_TAIL_RE = /(?:ANS(?:WER)?|CORRECT(?:\s+(?:ANSWER|OPTION))?)\s*[:\-–]\s*\(?([A-Ha-h])\)?\s*\.?(?:\s|$)/i
const ANS_ONLY_RE = /^(?:ANS(?:WER)?|CORRECT(?:\s+(?:ANSWER)?)?)\s*[:\-–]\s*\(?([A-Ha-h])\)?\s*\.?(?:\s.*)?$/i
// full statement key line: "Answer: B. @OneToOne" / "Answer: D – Tables" (letter followed by the option text)
const ANS_SENTENCE_RE = /^(?:ANS(?:WER)?|CORRECT(?:\s+(?:ANSWER)?)?)\s*[:\-–]\s*\(?([A-Ha-h])\)?\s*[).:]\s*(.+)$/i
const KEY_BLOCK_RE = /^\s*(ANSWER\s*KEY|ANSWERS?|KEY|CORRECT\s+ANSWERS?)\s*:?\s*$/i

interface RawQuestion {
  startLine: number
  endLine: number
  number: number | null
  textLines: string[]
  options: Array<{ key: OptionKey; textLines: string[] }>
  page: number
  pageEnd: number
  resolvedKey: string | null
  ansSentenceText?: string
}

export function parseQuestions(lines: { page: number; text: string }[]): ParseOutput {
  const issues: ParseIssue[] = []
  const raw: RawQuestion[] = []
  const keyBlockEntries: Array<{ q: number; key: string }> = []
  let inKeyBlock = false
  let cur: RawQuestion | null = null

  const finishCur = () => {
    if (!cur) return
    if (cur.options.length < 2) {
      // Not a real MCQ (statement only / header fragment) — record and skip.
      issues.push({ message: `Line ${cur.startLine + 1} (page ${cur.page}): content looked like a question but fewer than 2 options were found; skipped.` })
      cur = null
      return
    }
    raw.push(cur)
    cur = null
  }

  for (let i = 0; i < lines.length; i++) {
    const { page } = lines[i]
    let line = lines[i].text.trim()
    if (!line) continue

    // end-of-document key block header
    if (KEY_BLOCK_RE.test(line)) {
      finishCur()
      inKeyBlock = true
      continue
    }

    // key header with entries attached on the same line: "Answer KEY: 1. B 2. D"
    const INLINE_KEY_HEADER = /^(?:ANS(?:WER)?\s*)?KEY\s*[:\-–]\s*(.+)$/i
    const inlineHeader = INLINE_KEY_HEADER.exec(line)
    if (inlineHeader) {
      const entries = parseKeyEntries(inlineHeader[1])
      if (entries.length > 0) {
        finishCur()
        keyBlockEntries.push(...entries)
        continue
      }
    }

    if (inKeyBlock) {
      const entries = parseKeyEntries(line)
      if (entries.length === 0) {
        const qStart = NUM_RE.exec(line)
        if (qStart && raw.length > 0) {
          inKeyBlock = false // key block ended; process normally below
        } else {
          continue // ignore stray lines inside key block
        }
      } else {
        keyBlockEntries.push(...entries)
        continue
      }
    }

    // per-question standalone key line — bare letter, and letter+option-text forms
    const ansOnly = ANS_ONLY_RE.exec(line)
    if (ansOnly && cur && cur.options.length > 0 && cur.resolvedKey == null) {
      cur.resolvedKey = ansOnly[1].toUpperCase()
      continue
    }
    const ansSentence = ANS_SENTENCE_RE.exec(line)
    if (ansSentence && cur && cur.options.length > 0 && cur.resolvedKey == null) {
      const letter = ansSentence[1].toUpperCase()
      const keyOpt = cur.options.find((o) => o.key === letter)
      // sanity: a key line whose letter is not an extracted option, or whose
      // letter equals the LAST option while the text is a *different* option's
      // text, is suspicious — still accept: the letter is the primary signal.
      cur.resolvedKey = letter
      cur.ansSentenceText = ansSentence[2]
      if (keyOpt) {
        // remove a glued "Answer: X. <text>" tail from the option if present
        keyOpt.textLines = keyOpt.textLines.map((t) => t.replace(/\s*(?:ANS(?:WER)?|CORRECT(?:\s+(?:ANSWER)?)?)\s*[:\-–]\s*\(?[A-Ha-h]\)?\s*[).:]?\s*\S.*$/i, '').trim()).filter((t) => t)
      }
      continue
    }

    // numbered question start — or inline key entry "3. C"
    const numMatch = NUM_RE.exec(line)
    if (numMatch) {
      const rest = numMatch[2].trim()
      // "N. C" while a question with >=2 options is open → answer entry for cur
      if (/^[A-Ha-h][\s.]*$/.test(rest) && cur && cur.options.length >= 2) {
        if (cur.resolvedKey == null) cur.resolvedKey = rest[0].toUpperCase()
        continue
      }
      finishCur()
      // strip trailing inline key from the statement text
      let text = rest
      const tail = ANS_TAIL_RE.exec(text)
      let resolvedKey: string | null = null
      if (tail) {
        resolvedKey = tail[1].toUpperCase()
        text = text.slice(0, tail.index).trim()
      }
      cur = {
        startLine: i,
        endLine: i,
        number: parseInt(numMatch[1], 10),
        textLines: [text],
        options: [],
        page,
        pageEnd: page,
        resolvedKey,
      }
      continue
    }

    // continuation / option line
    if (cur) {
      attachOptionOrText(cur, line, i, page)
    }
    // else: preamble before the first question — ignored
  }
  finishCur()

  // Build final question array
  const questions: Question[] = raw.map((rq, i) => ({
    id: `q-${i}`,
    originalNumber: rq.number,
    bankIndex: i,
    text: rq.textLines.join(' ').replace(/\s+/g, ' ').trim(),
    options: rq.options.map((o): McqOption => ({ key: o.key, text: o.textLines.join(' ').replace(/\s+/g, ' ').trim() })),
    correctAnswer: null,
    answerIssue: null,
    sourcePage: rq.page,
    sourcePageEnd: rq.pageEnd,
  }))

  // apply inline keys
  raw.forEach((rq, i) => {
    const key = rq.resolvedKey
    if (!key || !questions[i]) return
    const q = questions[i]
    const mapped = q.options.some((o) => o.key === key) ? (key as OptionKey) : null
    if (mapped) {
      q.correctAnswer = mapped
      // cross-check: if the key line also spelled out the option's text and it
      // clearly disagrees with the extracted option, keep the key but surface
      // the parser's ambiguity note so the editor flags it.
      const spelled = rq.ansSentenceText?.replace(/\s+/g, ' ').trim().toLowerCase()
      const oi = q.options.findIndex((o) => o.key === key)
      const optText = q.options[oi].text.replace(/\s+/g, ' ').trim().toLowerCase()
      if (spelled && optText && !optText.includes(spelled) && !spelled.includes(optText) && !maybeSimilar(spelled, optText)) {
        issues.push({
          message: `Question ${rq.number ?? i + 1}: the key line spelled a different option text ("${rq.ansSentenceText}") than option ${key} ("${q.options[oi].text}"). Verify manually.`,
          questionIndex: i,
        })
      }
    } else {
      q.answerIssue = 'key-option-missing'
      issues.push({
        message: `Question ${rq.number ?? i + 1}: answer key "${key}" was detected, but option ${key} was not extracted. Fix manually.`,
        questionIndex: i,
      })
    }
  })

  // apply end-of-document key block
  if (keyBlockEntries.length > 0) {
    const byNumber = new Map<number, number>()
    raw.forEach((rq, i) => {
      if (rq.number != null && !byNumber.has(rq.number)) byNumber.set(rq.number, i)
    })
    let applied = 0
    let matchedSkipped = 0 // entry pointed at a real question but its key was already set inline
    let ambiguous: number[] = []
    for (const { q, key } of keyBlockEntries) {
      const bankIdx = byNumber.get(q)
      if (bankIdx == null) {
        ambiguous.push(q)
        continue
      }
      const question = questions[bankIdx]
      if (question.correctAnswer != null) { matchedSkipped++; continue } // inline key already applied; keep first-found
      const opt = question.options.find((o) => o.key === key)
      if (opt) {
        question.correctAnswer = key as OptionKey
        applied++
      } else {
        question.answerIssue = 'key-option-missing'
        issues.push({
          message: `Question ${q}: answer key says "${key}" but option ${key} was not extracted. Fix manually.`,
          questionIndex: bankIdx,
        })
      }
    }
    if (applied === 0 && matchedSkipped === 0) {
      issues.push({
        message: `An answer-key section was found with ${keyBlockEntries.length} entries, but none could be matched to extracted questions.`,
      })
    }
  }

  return { questions, issues }
}

function maybeSimilar(a: string, b: string): boolean {
  // crude similarity: shared distinctly-long words
  const wa = new Set(a.split(/[^a-z0-9@]+/).filter((w) => w.length >= 4))
  const wb = new Set(b.split(/[^a-z0-9@]+/).filter((w) => w.length >= 4))
  if (wa.size === 0 || wb.size === 0) return true // can't judge → don't flag
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.min(wa.size, wb.size) >= 0.5
}

function parseKeyEntries(line: string): Array<{ q: number; key: string }> {
  const out: Array<{ q: number; key: string }> = []
  // entries like "1. B" "1-B) (B)" "12.C" separated by wide gaps or preceded by nothing
  const re = /(\d{1,4})\s*[).:\-–]?\s*\(?([A-Ha-h])\)?\.?(?=\s|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    out.push({ q: parseInt(m[1], 10), key: m[2].toUpperCase() })
  }
  return out
}

function attachOptionOrText(rq: RawQuestion, line: string, lineIdx: number, page: number) {
  rq.pageEnd = page
  // trailing inline key on a continuation/option line
  let cleaned = line
  const ansTail = ANS_TAIL_RE.exec(line)
  if (ansTail) {
    if (rq.resolvedKey == null) rq.resolvedKey = ansTail[1].toUpperCase()
    cleaned = line.slice(0, ansTail.index).trim()
  } else {
    // glued sentence key on the tail of an option line: "D. Tables Answer: D. Tables"
    const sentence = ANS_SENTENCE_RE.exec(line)
    if (sentence && rq.options.length > 0 && rq.resolvedKey == null) {
      rq.resolvedKey = sentence[1].toUpperCase()
      rq.ansSentenceText = sentence[2]
      cleaned = line.slice(0, sentence.index).trim()
    }
  }

  const m = OPT_RE.exec(cleaned)
  if (m) {
    const foundKey = (m[1] ?? m[2]).toUpperCase() as OptionKey
    const text = m[3].trim()
    let expected: string
    if (rq.options.length === 0) expected = 'A'
    else {
      const last = rq.options[rq.options.length - 1].key
      const idx = OPTION_KEYS.indexOf(last)
      expected = OPTION_KEYS[idx + 1] ?? ''
    }
    if (foundKey === expected) {
      rq.options.push({ key: foundKey, textLines: [text] })
      rq.endLine = lineIdx
      return
    }
    if (rq.options.length > 0) {
      // out-of-sequence letter — treat as continuation of previous option
      rq.options[rq.options.length - 1].textLines.push(cleaned)
      rq.endLine = lineIdx
      return
    }
    // no options yet and not "A" — treat as statement
    rq.textLines.push(cleaned)
    rq.endLine = lineIdx
    return
  }

  if (rq.options.length > 0) {
    rq.options[rq.options.length - 1].textLines.push(cleaned)
  } else {
    rq.textLines.push(cleaned)
  }
  rq.endLine = lineIdx
}
