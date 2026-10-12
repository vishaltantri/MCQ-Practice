import { useEffect, useState } from 'react'
import type { BankRecord, McqOption, OptionKey, Question } from '../types'
import { OPTION_KEYS } from '../types'
import { getBank, putBank } from '../storage'
import { bankStats } from '../bank'
import type { Screen } from '../App'

export function EditScreen(props: { bankId: string; onGo: (s: Screen) => void; onRefresh: () => void }) {
  const [bank, setBank] = useState<BankRecord | null>(null)
  const [query, setQuery] = useState('')
  const [issuesShown, setIssuesShown] = useState(true)

  useEffect(() => { getBank(props.bankId).then((b) => setBank(b ?? null)) }, [props.bankId])
  if (!bank) return <div className="card muted">Loading…</div>

  const stats = bankStats(bank)

  const save = async (next: BankRecord) => {
    setBank({ ...next })
    await putBank(next)
    props.onRefresh()
  }

  const updateQuestion = (i: number, patch: Partial<Question>) => {
    const questions = bank.questions.slice()
    questions[i] = { ...questions[i], ...patch }
    save({ ...bank, questions })
  }

  const updateOption = (qi: number, oi: number, text: string) => {
    const questions = bank.questions.slice()
    const options = questions[qi].options.slice()
    options[oi] = { ...options[oi], text }
    questions[qi] = { ...questions[qi], options }
    save({ ...bank, questions })
  }

  const setKey = (qi: number, k: OptionKey | null) => {
    const questions = bank.questions.slice()
    questions[qi] = { ...questions[qi], correctAnswer: k, answerIssue: null }
    save({ ...bank, questions })
  }

  const deleteQuestion = (i: number) => {
    // keep bankIndex of other questions intact: splice + reindex
    const questions = bank.questions.filter((_, j) => j !== i).map((q, j) => ({ ...q, bankIndex: j, id: `q-${j}` }))
    // answers were keyed by bankIndex; remap: after deletion, index j has new bankIndex j
    const answers: Record<number, number> = {}
    for (const [k, v] of Object.entries(bank.answers)) {
      const idx = Number(k)
      if (idx < i) answers[idx] = v
      else if (idx > i) answers[idx - 1] = v
    }
    save({ ...bank, questions, answers })
  }

  const addQuestion = () => {
    const q: Question = {
      id: `q-${bank.questions.length}`,
      originalNumber: null,
      bankIndex: bank.questions.length,
      text: '',
      options: OPTION_KEYS.slice(0, 4).map((k) => ({ key: k, text: '' })),
      correctAnswer: null,
      answerIssue: null,
      sourcePage: 0,
    }
    save({ ...bank, questions: [...bank.questions, q] })
  }

  const filtered = bank.questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => !query || q.text.toLowerCase().includes(query.toLowerCase()) || String(i) === query)

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Edit questions</h1>
          <div className="muted">
            {stats.total} questions · {stats.unknownKeys} without answer key
          </div>
        </div>
        <button className="btn secondary" onClick={() => props.onGo({ name: 'dashboard', bankId: bank.id })}>Done</button>
      </div>

      <input type="text" placeholder="Search question text or number…" value={query} onChange={(e) => setQuery(e.target.value)} />

      {issuesShown && stats.unknownKeys > 0 && (
        <div className="info-box" style={{ marginTop: 10 }}>
          {stats.unknownKeys} question{stats.unknownKeys === 1 ? 's' : ''} have no verified answer key. They will be marked <strong>ungraded</strong> in results until you set the correct answer in the editor.
          <button className="btn subtle small" style={{ marginLeft: 10 }} onClick={() => setIssuesShown(false)}>Dismiss</button>
        </div>
      )}

      <div className="row" style={{ margin: '14px 0' }}>
        <button
          className="btn secondary"
          onClick={() => {
            const firstUnknown = bank.questions.findIndex((q) => q.correctAnswer == null)
            if (firstUnknown >= 0) {
              setQuery('')
              document.querySelector(`#qedit-${firstUnknown}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
        >
          Jump to first missing key
        </button>
        <button className="btn" onClick={addQuestion}>+ Add question</button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {filtered.map(({ q, i }) => (
          <QuestionEditor
            key={q.bankIndex}
            id={`qedit-${i}`}
            q={q}
            rawNumber={i + 1}
            onText={(t) => updateQuestion(i, { text: t })}
            onOption={(oi, t) => updateOption(i, oi, t)}
            onKey={setKey.bind(null, i)}
            onDelete={() => deleteQuestion(i)}
          />
        ))}
        {filtered.length === 0 && <div className="card muted">No questions match the search.</div>}
      </div>
    </>
  )
}

function QuestionEditor(props: {
  id: string
  q: Question
  rawNumber: number
  onText: (t: string) => void
  onOption: (oi: number, t: string) => void
  onKey: (k: OptionKey | null) => void
  onDelete: () => void
}) {
  const { q } = props
  return (
    <div className="card" id={props.id}>
      <div className="row spread">
        <strong>Question {props.rawNumber}</strong>
        <button className="btn warn small" onClick={props.onDelete}>Delete</button>
      </div>
      <textarea
        value={q.text}
        onChange={(e) => props.onText(e.target.value)}
        style={{ marginTop: 8 }}
      />
      {q.options.map((o, oi) => (
        <OptionRow key={o.key} o={o} onChange={(t) => props.onOption(oi, t)} />
      ))}
      <div className="row" style={{ marginTop: 8 }}>
        <span className="muted">Correct answer:</span>
        {OPTION_KEYS.slice(0, q.options.length).map((k) => (
          <button
            key={k}
            className={`btn small ${q.correctAnswer === k ? '' : 'subtle'}`}
            style={q.correctAnswer === k ? { background: 'var(--good)' } : undefined}
            onClick={() => props.onKey(q.correctAnswer === k ? null : k)}
          >
            {k}
          </button>
        ))}
        <span className="muted">(click again to mark unknown)</span>
      </div>
      {q.sourcePage ? <div className="muted" style={{ marginTop: 6 }}>Source: p. {q.sourcePage}</div> : null}
    </div>
  )
}

function OptionRow(props: { o: McqOption; onChange: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      <span className="key" style={{ fontWeight: 700, color: 'var(--accent)', alignSelf: 'center', minWidth: 18 }}>{props.o.key}</span>
      <textarea
        value={props.o.text}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ minHeight: 0, height: 'auto' }}
        rows={1}
      />
    </div>
  )
}
