// Core domain types shared by extraction, storage, batching, and the UI.

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export interface McqOption {
  key: OptionKey
  text: string
}

export type AnswerMark = OptionKey | null // null = unknown answer

export interface Question {
  /** Stable ID: [bankId],[question #] — IDs are assigned in document order and never renumbered. */
  id: string
  /** Question number as printed in the PDF (e.g. 207), when identifiable; null otherwise. */
  originalNumber: number | null
  /** Position within the extracted bank, 0-based. Fixed at extraction time. */
  bankIndex: number
  text: string
  options: McqOption[]
  /** Verified correct answer from the PDF's answer key. null = no reliable key found. */
  correctAnswer: AnswerMark
  /** Set when the key value could not be mapped onto the extracted options. */
  answerIssue?: 'key-option-missing' | 'key-parse-failed' | null
  sourcePage: number // 1-based
  sourcePageEnd?: number
  flaggedText?: string // raw text of a "flag for review" annotation, if parser saw one
}

export type SessionKind =
  | { kind: 'batch'; batch: number; size: number }
  | { kind: 'range'; from: number; to: number } // inclusive bankIndex, computed by caller (practise all, unanswered, etc.)

export interface PracticeSession {
  id: string
  bankId: string
  createdAt: number
  updatedAt: number
  /** Ordered question ids in this session (shuffled order is materialised here). */
  order: number[] // bankIndex values
  answers: Record<number, number> // bankIndex -> chosen option ordinal
  submittedAt: number | null
  submittedOrder: number[] | null // order snapshot at submit time
}

export interface BankMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  questionCount: number
  answeredCount: number
  correctCount: number
  incorrectCount: number
  totalCount: number
  batchSize: number
}

export interface BankRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  questions: Question[]
  batchSize: number
  /** Per-question answer state persisted across sessions. bankIndex -> chosen option ordinal. */
  answers: Record<number, number>
  /** Result of each graded submission, newest last. */
  history: Array<{
    at: number
    sessionId: string
    label: string // human-readable session label, e.g. "Batch 3"
    total: number
    answered: number
    correct: number
    incorrect: number
    ungraded: number
  }>
  reviewedUpTo: number // bankIndex; used to avoid re-flagging
}
