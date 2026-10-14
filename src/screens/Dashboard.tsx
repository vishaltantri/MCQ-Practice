import { useEffect, useState } from 'react'
import type { BankRecord } from '../types'
import { getBank, putBank } from '../storage'
import { bankStats } from '../bank'
import { computeBatches } from '../batching'
import type { Screen } from '../App'

export function DashboardScreen(props: { bankId: string; onGo: (s: Screen) => void; onRefresh: () => void }) {
  const [bank, setBank] = useState<BankRecord | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => { getBank(props.bankId).then((b) => setBank(b ?? null)) }, [props.bankId])
  if (!bank) return <div className="card muted">Loading…</div>

  const stats = bankStats(bank)
  const batches = computeBatches(stats.total, bank.batchSize)

  const badge = (answered: number, total: number) =>
    answered === 0 ? 'Not started' : answered === total ? 'Completed' : 'In progress'

  const rangeLabel = (b: { from: number; to: number }) =>
    `Questions ${b.from + 1}–${b.to + 1}`

  const batchAnswered = (b: { from: number; to: number }) => {
    let n = 0
    for (let i = b.from; i <= b.to; i++) if (bank.answers[i] != null) n++
    return n
  }

  const startBatch = (b: { index: number; from: number; to: number }) => {
    const order = Array.from({ length: b.to - b.from + 1 }, (_, i) => b.from + i)
    props.onGo({ name: 'practice', bankId: bank.id, order, label: `Batch ${b.index + 1}`, batchSize: bank.batchSize })
  }

  // Retry a batch from scratch: clear the batch's locked answers before entering.
  const retryBatch = (b: { index: number; from: number; to: number }) => {
    const answers = { ...bank.answers }
    for (let i = b.from; i <= b.to; i++) delete answers[i]
    const updated = { ...bank, answers }
    putBank(updated).then(() => {
      setBank(updated)
      startBatch(b)
    })
  }

  const startRange = (idxs: number[], label: string) => {
    if (idxs.length === 0) return
    props.onGo({ name: 'practice', bankId: bank.id, order: idxs, label, batchSize: bank.batchSize })
  }

  const unansweredIdx = () =>
    bank.questions.map((_, i) => i).filter((i) => bank.answers[i] == null)

  const incorrectIdx = () =>
    Object.entries(bank.answers)
      .map(([k]) => Number(k))
      .filter((i) => {
        const q = bank.questions[i]
        const chosen = bank.answers[i]
        return q && q.correctAnswer != null && q.options[chosen]?.key !== q.correctAnswer
      })

  const selectedBatchesPractice = () => {
    const picked = Array.from(selected)
    const idxs: number[] = []
    picked.forEach((bi) => {
      const b = batches[bi]
      for (let i = b.from; i <= b.to; i++) idxs.push(i)
    })
    idxs.sort((a, b) => a - b)
    startRange(idxs, `Selected batches (${picked.length})`)
  }

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{bank.name}</h1>
          <div className="muted">
            {stats.total} questions · {batches.length} batches · batch size {bank.batchSize}
          </div>
        </div>
        <div className="row">
          <button className="btn secondary" onClick={() => props.onGo({ name: 'edit', bankId: bank.id })}>Edit questions</button>
          <button className="btn secondary" onClick={() => props.onGo({ name: 'banks' })}>All banks</button>
        </div>
      </div>

      <div className="card">
        <div className="stat-row">
          <div className="stat"><div className="num">{stats.total}</div><div className="lbl">Total</div></div>
          <div className="stat"><div className="num">{stats.answered}</div><div className="lbl">Answered</div></div>
          <div className="stat"><div className="num">{stats.remaining}</div><div className="lbl">Remaining</div></div>
          <div className="stat"><div className="num">{stats.accuracy != null ? `${stats.accuracy}%` : '—'}</div><div className="lbl">Accuracy</div></div>
          {stats.unknownKeys > 0 && (
            <div className="stat"><div className="num">{stats.unknownKeys}</div><div className="lbl">No answer key</div></div>
          )}
        </div>
        <div className="row">
          <button className="btn" onClick={() => startRange(bank.questions.map((_, i) => i), 'All questions')}>
            Practise All Questions
          </button>
          <button
            className="btn secondary"
            disabled={stats.remaining === 0}
            onClick={() => startRange(unansweredIdx(), 'Unanswered')}
          >
            Practise Unanswered
          </button>
          <button
            className="btn secondary"
            disabled={incorrectIdx().length === 0}
            onClick={() => startRange(incorrectIdx(), 'Incorrect')}
          >
            Retry Incorrect
          </button>
          {selected.size > 0 && (
            <button className="btn" onClick={selectedBatchesPractice}>
              Practise {selected.size} selected batch{selected.size > 1 ? 'es' : ''}
            </button>
          )}
        </div>
      </div>

      <h2>Batches</h2>
      <div className="grid-batches">
        {batches.map((b) => {
          const n = batchAnswered(b)
          return (
            <div className="card" key={b.index}>
              <div className="row spread">
                <strong>Batch {b.index + 1}</strong>
                <label className="muted" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" checked={selected.has(b.index)} onChange={() => toggleSelect(b.index)} />
                  select
                </label>
              </div>
              <div className="muted">{rangeLabel(b)} · {badge(n, b.size)}</div>
              <div className="muted">
                {n} answered, {b.size - n} remaining
              </div>
              <div className="row">
                <button className="btn small" onClick={() => startBatch(b)}>
                  {n === 0 ? 'Start Practice' : n === b.size ? 'View Results' : 'Resume Practice'}
                </button>
                {n > 0 && (
                  <button className="btn secondary small" onClick={() => retryBatch(b)}>
                    Retry batch
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
