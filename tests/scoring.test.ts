import { describe, it, expect } from 'vitest'
import { scoreSubmission } from '../src/scoring'
import type { Question } from '../src/types'

function mk(i: number, options: string[], correct: string | null): Question {
  return {
    id: `q-${i}`,
    originalNumber: i + 1,
    bankIndex: i,
    text: `Question ${i + 1}`,
    options: options.map((t, j) => ({ key: 'ABCDEFGH'[j] as any, text: t })),
    correctAnswer: (correct as any) ?? null,
    answerIssue: null,
    sourcePage: 1,
  }
}

describe('scoreSubmission', () => {
  const qs = [
    mk(0, ['x', 'y', 'z', 'w'], 'B'), // chose A -> incorrect
    mk(1, ['x', 'y', 'z', 'w'], 'B'), // chose B -> correct
    mk(2, ['x', 'y', 'z', 'w'], 'B'), // unanswered
    mk(3, ['x', 'y', 'z', 'w'], null), // answered but ungraded
    mk(4, ['x', 'y', 'z', 'w'], null), // unanswered (still ungraded)
  ]
  const answers = { 0: 0, 1: 1, 3: 2 }
  const order = [0, 1, 2, 3, 4]

  it('counts correct, incorrect, unanswered and ungraded correctly', () => {
    const r = scoreSubmission(qs, answers, order)
    expect(r.total).toBe(5)
    expect(r.correct).toBe(1)
    expect(r.incorrect).toBe(1)
    expect(r.unanswered).toBe(1) // q2 has key, no answer
    expect(r.ungraded).toBe(2) // q3, q4 key unknown
    expect(r.answered).toBe(3)
  })

  it('empty answers -> all questions with keys are unanswered', () => {
    const r = scoreSubmission(qs, {}, order)
    expect(r.correct).toBe(0)
    expect(r.incorrect).toBe(0)
    expect(r.unanswered).toBe(3)
    expect(r.ungraded).toBe(2)
  })

  it('changing answer changes the result (submission-time snapshot)', () => {
    const changed = scoreSubmission(qs, { ...answers, 0: 1 }, order)
    expect(changed.correct).toBe(2)
    expect(changed.incorrect).toBe(0)
  })

  it('ignores answers outside the session order', () => {
    const r = scoreSubmission(qs, { 0: 0, 1: 1, 77: 2 }, [0, 1])
    expect(r.total).toBe(2)
    expect(r.answered).toBe(2)
  })
})
