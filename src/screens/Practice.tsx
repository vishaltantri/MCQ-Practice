import { useEffect, useState } from 'react'
import type { BankRecord } from '../types'
import { getBank, putBank } from '../storage'
import type { Screen } from '../App'

/** Immediate-feedback practice session:
 * - Clicking an option instantly shows Correct!/Incorrect! and locks the question.
 * - Running correct/incorrect count is always visible.
 * - At the end of the session, a summary (correct/incorrect/unanswered) is shown.
 */
export function PracticeScreen(props: {
  bankId: string
  order: number[]
  label: string
  batchSize: number
  onGo: (s: Screen) => void
  onRefresh: () => void
}) {
  const [bank, setBank] = useState<BankRecord | null>(null)
  const [pos, setPos] = useState(0)
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => { getBank(props.bankId).then((b) => setBank(b ?? null)) }, [props.bankId])
  if (!bank) return <div className="card muted">Loading…</div>

  const q = bank.questions[props.order[pos]]

  if (!q) {
    // Session with no questions at all — show summary straight away.
    return (
      <>
        <div className="card muted">This session has no questions.</div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={openSummaryFromEmpty}>Show summary</button>
          <button className="btn secondary" onClick={() => props.onGo({ name: 'dashboard', bankId: bank.id })}>Dashboard</button>
        </div>
      </>
    )
  }

  const chosen = bank.answers[q.bankIndex] ?? null
  const locked = chosen != null // once answered, this question is locked
  const graded = q.correctAnswer != null
  const cameCorrect = locked && graded && q.options[chosen]?.key === q.correctAnswer
  const answeredCount = props.order.filter((i) => bank.answers[i] != null).length
  const runningCorrect = props.order.filter((i) => {
    const qq = bank.questions[i]
    const a = bank.answers[i]
    return qq && a != null && qq.correctAnswer != null && qq.options[a]?.key === qq.correctAnswer
  }).length
  const runningIncorrect = props.order.filter((i) => {
    const qq = bank.questions[i]
    const a = bank.answers[i]
    return qq && a != null && qq.correctAnswer != null && qq.options[a]?.key !== qq.correctAnswer
  }).length

  const choose = async (optIdx: number) => {
    if (locked) return // no changing answers / no multiple attempts
    bank.answers = { ...bank.answers, [q.bankIndex]: optIdx }
    setBank({ ...bank })
    await putBank(bank) // autosave
  }

  const clear = async () => {
    if (locked) return
    delete bank.answers[q.bankIndex]
    setBank({ ...bank, answers: { ...bank.answers } })
    await putBank(bank)
  }

  const go = (p: number) => setPos(Math.max(0, Math.min(props.order.length - 1, p)))

  const finish = () => setShowSummary(true)

  const openResults = () => {
    // persist a history entry, then navigate to full results review
    const result = {
      total: props.order.length,
      answered: answeredCount,
      correct: runningCorrect,
      incorrect: runningIncorrect,
      ungraded: props.order.filter((i) => {
        const qq = bank.questions[i]
        return qq && qq.correctAnswer == null
      }).length,
    }
    bank.history = [
      ...bank.history,
      {
        at: Date.now(),
        sessionId: `${props.label}-${Date.now()}`,
        label: props.label,
        total: result.total,
        answered: result.answered,
        correct: result.correct,
        incorrect: result.incorrect,
        ungraded: result.ungraded,
      },
    ]
    putBank(bank).then(() => {
      props.onGo({
        name: 'results',
        bankId: bank.id,
        label: props.label,
        order: props.order,
        batchSize: props.batchSize,
      })
    })
  }

  function openSummaryFromEmpty() {
    setShowSummary(true)
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ fontSize: '1.2rem' }}>{props.label}</h1>
          <div className="muted">
            Question {pos + 1} of {props.order.length} · {answeredCount} answered
          </div>
        </div>
        <button className="btn secondary" onClick={() => props.onGo({ name: 'dashboard', bankId: bank.id })}>
          Exit
        </button>
      </div>
      <div className="progressbar"><div style={{ width: `${((pos + 1) / props.order.length) * 100}%` }} /></div>

      <div className="card question-card">
        <div className="muted">Question {q.originalNumber ?? pos + 1}{q.sourcePage ? ` · p. ${q.sourcePage}` : ''}</div>
        <div className="q-text">{q.text}</div>
        {q.options.map((o, oi) => {
          const isChosen = chosen === oi
          const isCorrectOption = graded && o.key === q.correctAnswer
          let cls = 'option'
          if (isChosen) cls += ' selected'
          if (locked && graded && isCorrectOption) cls += ' correct'
          if (locked && graded && isChosen && !isCorrectOption) cls += ' wrong'
          if (locked && !isChosen && !isCorrectOption) cls += ' dim'
          return (
            <button
              key={o.key}
              className={cls}
              disabled={locked}
              onClick={() => choose(oi)}
            >
              <span className="key">{o.key}</span>
              <span>{o.text}</span>
            </button>
          )
        })}

        {locked && graded && (
          <div className={`feedback ${cameCorrect ? 'fb-correct' : 'fb-wrong'}`}>
            <strong>{cameCorrect ? '✓ Correct!' : '✗ Incorrect!'}</strong>{' '}
            {!cameCorrect && <>Correct answer: <strong>{q.correctAnswer}</strong></>}
          </div>
        )}
        {locked && !graded && (
          <div className="feedback fb-neutral">
            Answer saved: <strong>{q.options[chosen]?.key}</strong> — no verified answer key for this question.
          </div>
        )}

        <div className="row spread" style={{ marginTop: 14 }}>
          <div className="row">
            <button className="btn secondary small" onClick={() => go(pos - 1)} disabled={pos === 0}>← Prev</button>
            <button className="btn subtle small" onClick={clear} disabled={locked}>Clear answer</button>
          </div>
          <button className="btn" onClick={() => (pos === props.order.length - 1 ? finish() : go(pos + 1))}>
            {pos === props.order.length - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>

      <div className="scorebar">
        <div className="stat small"><span className="dot good" /><span style={{ color: 'var(--good)' }}>{runningCorrect} correct</span></div>
        <div className="stat small"><span className="dot bad" /><span style={{ color: 'var(--bad)' }}>{runningIncorrect} incorrect</span></div>
        <div className="stat small muted">{answeredCount - runningCorrect - runningIncorrect} without key</div>
      </div>

      <div className="navigator">
        {props.order.map((idx, p) => {
          const qq = bank.questions[idx]
          const a = bank.answers[idx]
          let cls = ''
          if (p === pos) cls += ' current '
          if (a != null) {
            if (qq?.correctAnswer == null) cls += 'answered '
            else cls += qq.options[a]?.key === qq.correctAnswer ? 'correct ' : 'wrong '
          }
          return (
            <button key={p} className={cls.trim()} onClick={() => go(p)}>{p + 1}</button>
          )
        })}
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        Answers lock as soon as you click — correctness is shown immediately.
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn secondary" onClick={finish}>Finish / Summary</button>
      </div>

      {showSummary && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 style={{ marginTop: 0 }}>{props.label} — Summary</h2>
            <div className="stat-row">
              <div className="stat"><div className="num">{props.order.length}</div><div className="lbl">Total</div></div>
              <div className="stat"><div className="num" style={{ color: 'var(--good)' }}>{runningCorrect}</div><div className="lbl">Correct</div></div>
              <div className="stat"><div className="num" style={{ color: 'var(--bad)' }}>{runningIncorrect}</div><div className="lbl">Incorrect</div></div>
              <div className="stat"><div className="num">{answeredCount - runningCorrect - runningIncorrect}</div><div className="lbl">No key</div></div>
            </div>
            <div className="row">
              <button className="btn" onClick={openResults}>See detailed results</button>
              <button className="btn secondary" onClick={() => setShowSummary(false)}>Keep practising</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
