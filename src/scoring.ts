// Scoring: compare chosen answers against the verified answer key at submit time.
//
// Rules:
// - answered + matches key        -> correct
// - answered + differs from key   -> incorrect
// - no answer + key exists        -> unanswered (not counted as incorrect)
// - key unknown (null)            -> ungraded, regardless of whether an answer was chosen

import type { Question } from './types'

export interface PerQuestionResult {
  bankIndex: number
  chosen: number | null
  correct: number | null
  status: 'correct' | 'incorrect' | 'unanswered' | 'ungraded'
  chosenKey: string | null
  correctKey: string | null
}

export interface SubmissionResult {
  total: number
  answered: number
  correct: number
  incorrect: number
  unanswered: number
  ungraded: number
  perQuestion: PerQuestionResult[]
}

export function scoreSubmission(questions: Question[], answers: Record<number, number>, order: number[]): SubmissionResult {
  const result: SubmissionResult = {
    total: order.length,
    answered: 0,
    correct: 0,
    incorrect: 0,
    unanswered: 0,
    ungraded: 0,
    perQuestion: [],
  }
  for (const idx of order) {
    const q = questions[idx]
    if (!q) continue // defensive: order references a question the bank no longer has
    const chosen = answers[idx] ?? null
    const chosenOpt = chosen != null ? q.options[chosen] : undefined
    const chosenKey = chosenOpt ? chosenOpt.key : null

    let status: PerQuestionResult['status']
    let correctOrdinal: number | null = null
    if (q.correctAnswer == null) {
      status = 'ungraded'
      result.ungraded++
      if (chosen != null) result.answered++
    } else if (chosen == null) {
      status = 'unanswered'
      result.unanswered++
    } else {
      result.answered++
      correctOrdinal = q.options.findIndex((o) => o.key === q.correctAnswer)
      status = correctOrdinal === chosen ? 'correct' : 'incorrect'
      if (status === 'correct') result.correct++
      else result.incorrect++
    }

    result.perQuestion.push({
      bankIndex: idx,
      chosen,
      correct: correctOrdinal,
      status,
      chosenKey,
      correctKey: q.correctAnswer ?? null,
    })
  }
  return result
}

export function scorePercent(correct: number, graded: number): number | null {
  return graded > 0 ? Math.round((correct / graded) * 100) : null
}
