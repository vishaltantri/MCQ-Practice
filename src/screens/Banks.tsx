import { useState } from 'react'
import type { BankRecord } from '../types'
import { deleteBank, putBank } from '../storage'
import { bankStats } from '../bank'
import type { Screen } from '../App'

export function BanksScreen(props: {
  banks: BankRecord[]
  onGo: (s: Screen) => void
  onRefresh: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)

  const doDelete = async (id: string) => {
    await deleteBank(id)
    setConfirmDelete(null)
    props.onRefresh()
  }
  const doRename = async () => {
    if (!renaming) return
    const bank = props.banks.find((b) => b.id === renaming.id)
    if (bank) {
      bank.name = renaming.name.trim() || bank.name
      await putBank(bank)
    }
    setRenaming(null)
    props.onRefresh()
  }

  return (
    <>
      <div className="topbar">
        <h1>My Question Banks</h1>
        <button className="btn" onClick={() => props.onGo({ name: 'upload' })}>+ Add PDF</button>
      </div>

      {props.banks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 44 }}>
          <div className="big" style={{ fontSize: 18, fontWeight: 600 }}>No question banks yet</div>
          <p className="muted">Upload a PDF containing multiple-choice questions to get started.</p>
          <button className="btn" onClick={() => props.onGo({ name: 'upload' })}>Upload a PDF</button>
        </div>
      )}

      <div className="grid-batches">
        {props.banks.map((bank) => {
          const s = bankStats(bank)
          return (
            <div className="card" key={bank.id}>
              <div className="row spread" style={{ gap: 8, alignItems: 'center', flexWrap: 'nowrap' }}>
                <strong
                  className="bank-name"
                  title={bank.name}
                  onClick={() => props.onGo({ name: 'dashboard', bankId: bank.id })}
                >
                  {bank.name}
                </strong>
                <span className="muted" style={{ flexShrink: 0 }} aria-hidden>✎</span>
              </div>
              <div className="muted">
                {s.total} questions · {Math.ceil(s.total / bank.batchSize)} batches
              </div>
              <div className="muted">
                {s.answered} answered · {s.accuracy != null ? `${s.accuracy}% accuracy` : 'no graded answers yet'}
              </div>
              <div className="row">
                <button
                  className="btn small"
                  onClick={() => props.onGo({ name: 'dashboard', bankId: bank.id })}
                >
                  Open
                </button>
                <button className="btn subtle small" onClick={() => { setRenaming({ id: bank.id, name: bank.name }) }}>
                  Rename
                </button>
                <button className="btn warn small" onClick={() => setConfirmDelete(bank.id)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 style={{ marginTop: 0 }}>Delete question bank?</h2>
            <p className="muted">This permanently removes the bank, its questions, answers and history. This cannot be undone.</p>
            <div className="row">
              <button className="btn warn" onClick={() => doDelete(confirmDelete)}>Delete</button>
              <button className="btn secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {renaming && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 style={{ marginTop: 0 }}>Rename bank</h2>
            <input
              type="text"
              value={renaming.name}
              autoFocus
              onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') doRename() }}
            />
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={doRename}>Save</button>
              <button className="btn secondary" onClick={() => setRenaming(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
