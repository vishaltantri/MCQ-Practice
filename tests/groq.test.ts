import { describe, it, expect } from 'vitest'
import { normaliseQuestion, chunkByLines, type RawLlmQuestion, type TextLine } from '../src/groq'

function raw(over: Partial<RawLlmQuestion> = {}): RawLlmQuestion {
  return {
    number: 1,
    text: 'What is the capital of France?',
    options: [
      { key: 'A', text: 'Berlin' },
      { key: 'B', text: 'Paris' },
      { key: 'C', text: 'Madrid' },
      { key: 'D', text: 'Rome' },
    ],
    answer: 'B',
    ...over,
  }
}

describe('normaliseQuestion (Groq response validation)', () => {
  it('passes through a clean question with correct answer', () => {
    const { q, issues } = normaliseQuestion(raw())
    expect(q).not.toBeNull()
    expect(q!.correctAnswer).toBe('B')
    expect(issues).toHaveLength(0)
    expect(q!.options).toHaveLength(4)
  })

  it('normalises option keys like "(A)", "a.", "option A"', () => {
    const { q } = normaliseQuestion(raw({
      options: [
        { key: '(A)', text: 'Berlin' },
        { key: 'b.', text: 'Paris' },
        { key: 'OPTION C', text: 'Madrid' },
        { key: 'D', text: 'Rome' },
      ],
    }))
    expect(q!.options.map((o) => o.key)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('separates an answer embedded at the end of the last option text — the reported bug', () => {
    const { q, issues } = normaliseQuestion(raw({
      options: [
        { key: 'A', text: 'Berlin' },
        { key: 'B', text: 'Paris' },
        { key: 'C', text: 'Madrid' },
        { key: 'D', text: 'Rome Answer: C' }, // answer stuck to the option
      ],
      answer: null, // model forgot to split it
    }))
    expect(q!.options[3].text).toBe('Rome')
    expect(q!.correctAnswer).toBe('C')
    expect(issues.some((i) => i.includes('embedded'))).toBe(true)
  })

  it('separates "Ans B" style inline answers too', () => {
    const { q } = normaliseQuestion(raw({
      options: [
        { key: 'A', text: '7' },
        { key: 'B', text: '9 Ans B' },
        { key: 'C', text: '11' },
        { key: 'D', text: '13' },
      ],
      answer: null,
    }))
    expect(q!.options[1].text).toBe('9')
    expect(q!.correctAnswer).toBe('B')
  })

  it('keeps option text that merely mentions the word "answer" mid-sentence', () => {
    const { q, issues } = normaliseQuestion(raw({
      text: 'Which sentence uses "answer" correctly?',
      options: [
        { key: 'A', text: 'Answer the question carefully.' },
        { key: 'B', text: 'The answer key was wrong.' },
        { key: 'C', text: 'Pick me.' },
        { key: 'D', text: 'Nothing.' },
      ],
    }))
    expect(issues.some((i) => i.includes('embedded'))).toBe(false)
    expect(q!.options[0].text).toBe('Answer the question carefully.')
  })

  it('rejects questions with fewer than 2 usable options', () => {
    const { q } = normaliseQuestion(raw({ options: [{ key: 'A', text: 'only one' }] }))
    expect(q).toBeNull()
  })

  it('rejects empty or missing question text', () => {
    expect(normaliseQuestion(raw({ text: '' })).q).toBeNull()
    expect(normaliseQuestion(raw({ text: 'ab' })).q).toBeNull()
  })

  it('nulls the answer when it points at a missing option instead of guessing', () => {
    const { q, issues } = normaliseQuestion(raw({ answer: 'E' }))
    expect(q!.correctAnswer).toBeNull()
    expect(issues.some((i) => i.includes('no matching option'))).toBe(true)
  })

  it('drops duplicate and unrecognised option keys', () => {
    const { q } = normaliseQuestion(raw({
      options: [
        { key: 'A', text: 'x' },
        { key: 'A', text: 'y' },
        { key: 'Z', text: 'z' },
        { key: 'B', text: 'ok' },
        { key: 'C', text: 'ok2' },
      ],
    }))
    expect(q!.options.map((o) => o.key)).toEqual(['A', 'B', 'C'])
  })
})

describe('chunkByLines (never splits a question)', () => {
  const lines: TextLine[] = []
  for (let i = 1; i <= 40; i++) {
    lines.push({ page: 1, text: `${i}. Question number ${i} about some topic or other?` })
    for (const L of ['A', 'B', 'C', 'D']) {
      lines.push({ page: 1, text: `(${L}) Option ${L} of question ${i} with some words` })
    }
  }
  // ~47 chars/question-line + ~45/option-line → ~227 chars per question → 24000/227 ≈ 105 questions

  it('keeps every question intact and yields the full set', () => {
    const chunks = chunkByLines(lines, 2400) // ~10 questions per chunk
    const reassembled = chunks.flatMap((c) => c.lines.map((l) => l.text))
    expect(reassembled).toEqual(lines.map((l) => l.text))
  })

  it('starts every chunk at a question-number boundary', () => {
    const chunks = chunkByLines(lines, 2400)
    for (const c of chunks.slice(1)) {
      expect(/^\d{1,4}[).:\-]\s/.test(c.lines[0].text)).toBe(true)
    }
  })

  it('produces more than one chunk for the 40-question document at a small max', () => {
    expect(chunkByLines(lines, 2400).length).toBeGreaterThan(1)
  })
})
