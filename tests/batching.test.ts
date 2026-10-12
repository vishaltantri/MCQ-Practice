import { describe, it, expect } from 'vitest'
import { computeBatches } from '../src/batching'

describe('computeBatches', () => {
  it('1 question -> 1 batch of 1', () => {
    const b = computeBatches(1, 10)
    expect(b).toHaveLength(1)
    expect(b[0]).toEqual({ index: 0, size: 1, from: 0, to: 0 })
  })
  it('10 questions -> 1 batch of 10', () => {
    const b = computeBatches(10, 10)
    expect(b).toHaveLength(1)
    expect(b[0]).toEqual({ index: 0, size: 10, from: 0, to: 9 })
  })
  it('11 questions -> 2 batches (10 + 1)', () => {
    const b = computeBatches(11, 10)
    expect(b).toHaveLength(2)
    expect(b[1]).toEqual({ index: 1, size: 1, from: 10, to: 10 })
  })
  it('100 questions -> 10 full batches', () => {
    const b = computeBatches(100, 10)
    expect(b).toHaveLength(10)
    expect(b[9]).toEqual({ index: 9, size: 10, from: 90, to: 99 })
  })
  it('435 questions -> 44 batches, last has 5', () => {
    const b = computeBatches(435, 10)
    expect(b).toHaveLength(44)
    expect(b[42]).toEqual({ index: 42, size: 10, from: 420, to: 429 })
    expect(b[43]).toEqual({ index: 43, size: 5, from: 430, to: 434 })
  })
  it('covering: every question in exactly one batch, order preserved', () => {
    const n = 1234
    const seen: number[] = []
    for (const b of computeBatches(n, 10)) {
      for (let i = b.from; i <= b.to; i++) seen.push(i)
    }
    expect(seen).toHaveLength(n)
    expect(new Set(seen).size).toBe(n)
    expect(seen).toEqual(Array.from({ length: n }, (_, i) => i))
  })
  it('respects custom batch size', () => {
    expect(computeBatches(25, 5)).toHaveLength(5)
    expect(computeBatches(25, 25)).toHaveLength(1)
  })
  it('0 questions -> no batches', () => {
    expect(computeBatches(0, 10)).toHaveLength(0)
  })
})
