import { useEffect, useMemo, useState } from 'react'
import type { BankRecord } from '../types'
import { getBank, putBank } from '../storage'
import { scoreSubmission } from '../scoring'
import { computeBatches } from '../batching'
import type { Screen } from '../App'

export function ResultsScreen(props: {
  bankId: string
  label: string
  order: number[]
  batchSize: number
  onGo: (s: Screen) => void
  onRefresh: () => void
}) {
  const [bank, setBank] = useState<BankRecord | null>(null)
  const result = useMemo(
    () => scoreSubmission(bank?.questions ?? [], bank?.answers ?? {}, props.order),
    [bank, props.order]
  )

  useEffect(() => { getBank(props.bankId).then((b) => setBank(b ?? null)) }, [props.bankId])
  if (!bank) return <div className="card muted">Loading…</div>
  const graded = result.correct + result.incorrect
  const pct = graded > 0 ? Math.round((result.correct / graded) * 100) : null

  // record history once per mount of a given (label, order)

  const nextBatchIdx = (() => {
    // for a single-batch session, offer the next batch
    const batches = computeBatches(bank.questions.length, props.batchSize)
    const m = /^Batch (\d+)$/.exec(props.label)
    if (!m) return null
    return Number(m[1]) < batches.length ? Number(m[1]) : null // 1-based

  })()

  const openOrder = (order: number[], label: string, clearAnswers = false) => {
    if (clearAnswers) {
      // Retrying questions must reset their locked answers, otherwise the
      // practice session shows the old verdicts and can't be re-answered.
      const answers = { ...bank.answers }
      for (const i of order) delete answers[i]
      putBank({ ...bank, answers })
    }
    props.onGo({ name: 'practice', bankId: bank.id, order, label, batchSize: props.batchSize })
  }

  const incorrectIdx = result.perQuestion.filter((p) => p.status === 'incorrect').map((p) => p.bankIndex)

  const nextBatchLabel = `Batch ${nextBatchIdx}`
  const nextBatchOrder = nextBatchIdx
    ? Array.from({ length: props.batchSize }, (_, i) => (nextBatchIdx - 1) * props.batchSize + i).filter((i) => i < bank.questions.length)
    : []

  return (
    <>
      <div className="topbar">
        <h1 style={{ fontSize: '1.3rem' }}>{props.label} — Results</h1>
        <button className="btn secondary" onClick={() => props.onGo({ name: 'dashboard', bankId: bank.id })}>Dashboard</button>
      </div>

      <div className="card">
        {pct != null ? (
          <>
            <div className="result-big">{pct}%</div>
            <div className="muted">Score based on {graded} answered question{graded === 1 ? '' : 's'} with a verified answer key.</div>
          </>
        ) : result.unanswered > 0 ? (
          <div className="muted">No questions were answered in this session — all {result.unanswered} questions with verified keys count as unanswered. Answer some questions and submit again to see a score.</div>
        ) : (
          <div className="muted">No graded questions in this session (no verified answer keys were found for them).</div>
        )}
        <div className="stat-row">
          <div className="stat"><div className="num">{result.total}</div><div className="lbl">Total</div></div>
          <div className="stat"><div className="num">{result.answered}</div><div className="lbl">Answered</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--good)' }}>{result.correct}</div><div className="lbl">Correct</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--bad)' }}>{result.incorrect}</div><div className="lbl">Incorrect</div></div>
          <div className="stat"><div className="num" style={{ color: 'var(--warn)' }}>{result.unanswered}</div><div className="lbl">Unanswered</div></div>
          {result.ungraded > 0 && (
            <div className="stat"><div className="num">{result.ungraded}</div><div className="lbl">Ungraded (no key)</div></div>
          )}
        </div>
        <div className="row">
          {incorrectIdx.length > 0 && (
            <button className="btn" onClick={() => openOrder(incorrectIdx, 'Retry incorrect', true)}>Retry Incorrect</button>
          )}
          <button className="btn secondary" onClick={() => openOrder(props.order, props.label)}>Retry this batch</button>
          {nextBatchIdx && (
            <button className="btn secondary" onClick={() => openOrder(nextBatchOrder, nextBatchLabel)}>Next batch</button>
          )}
          <button className="btn secondary" onClick={() => openOrder(bank.questions.map((_, i) => i), 'All questions')}>
            Practise All
          </button>
        </div>
      </div>

      <h2>Answer review</h2>
      <div className="card" style={{ padding: 0 }}>
        {result.perQuestion.map((pq, i) => {
          const q = bank.questions[pq.bankIndex]
          return (
            <div className={`review-row ${pq.status}`} key={i}>
              <span className="verdict">
                {pq.status === 'correct' && '✔ Correct'}
                {pq.status === 'incorrect' && '✘ Incorrect'}
                {pq.status === 'unanswered' && '— Unanswered'}
                {pq.status === 'ungraded' && '· Ungraded'}
              </span>
              <span>
                {q.originalNumber ?? `#${pq.bankIndex + 1}`} — {q.text.slice(0, 90)}{q.text.length > 90 ? '…' : ''}
                <div className="muted">
                  Your answer: {pq.chosenKey ?? 'none'}
                  {q.correctAnswer != null && <> · Correct answer: <strong>{q.correctAnswer}</strong></>}
                </div>
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
