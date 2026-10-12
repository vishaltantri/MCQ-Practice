// Batch computation: sequential windows of `batchSize` questions in bank order.
// Stable question ids (bankIndex) make batch membership independent of history.

export interface Batch {
  index: number // 0-based
  size: number
  /** Inclusive bankIndex range [from, to]. */
  from: number
  to: number
}

export function computeBatches(questionCount: number, batchSize: number): Batch[] {
  const size = Math.max(1, Math.floor(batchSize))
  const batches: Batch[] = []
  let idx = 0
  while (idx < questionCount) {
    batches.push({ index: idx / size, size: Math.min(size, questionCount - idx), from: idx, to: idx + Math.min(size, questionCount - idx) - 1 })
    idx += size
  }
  return batches
}
