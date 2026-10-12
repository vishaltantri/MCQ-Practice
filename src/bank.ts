// Bank helpers: derived stats and bank-level operations used by the UI.

import type { BankRecord } from './types'
import { computeBatches } from './batching'

export function bankStats(bank: BankRecord) {
  const total = bank.questions.length
  let answered = 0
  let correct = 0
  let incorrect = 0
  let ungraded = 0
  for (const [idxStr, opt] of Object.entries(bank.answers)) {
    const idx = Number(idxStr)
    const q = bank.questions[idx]
    if (!q || opt == null) continue
    answered++
    const chosen = q.options[opt]?.key ?? null
    if (q.correctAnswer == null) {
      ungraded++
    } else if (chosen === q.correctAnswer) correct++
    else incorrect++
  }
  const unknownKeys = bank.questions.filter((q) => q.correctAnswer == null).length
  return {
    total,
    answered,
    remaining: total - answered,
    correct,
    incorrect,
    ungraded,
    unknownKeys,
    accuracy: correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : null,
  }
}

export async function renameBank(bank: BankRecord, name: string) {
  bank.name = name
  await (await import('./storage')).putBank(bank)
}

export async function deleteAnswerFor(bank: BankRecord, bankIndex: number) {
  delete bank.answers[bankIndex]
  await (await import('./storage')).putBank(bank)
}

export { computeBatches }
