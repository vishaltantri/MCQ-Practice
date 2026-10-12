import { useEffect, useRef, useState } from 'react'
import { processDocument } from '../pipeline'
import { getStoredKey, storeKey, clearStoredKey, GroqError } from '../groq'
import { putBank } from '../storage'
import type { ParseIssue } from '../parser'
import type { BankRecord } from '../types'

export function UploadScreen(props: {
  onDone: (bankId: string, review?: boolean) => void
  onCancel: () => void
  initialFile?: File | null
}) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<ParseIssue[] | null>(null)
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const [pendingBank, setPendingBank] = useState<BankRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(getStoredKey() ?? '')
  const [showKey, setShowKey] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<File | null>(null)
  const startedRef = useRef(false)

  // If the user picked a file on the landing page, process it immediately once.
  useEffect(() => {
    if (props.initialFile && !startedRef.current) {
      startedRef.current = true
      void validate(props.initialFile)
    }
  }, [props.initialFile])

  const validate = async (file: File) => {
    setError(null)
    setIssues(null)
    setWarnings(null)
    setPendingBank(null)
    const lower = file.name.toLowerCase()
    const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf')
    const isDocx = lower.endsWith('.docx')
    if (!isPdf && !isDocx) {
      setError(`"${file.name}" is not a supported file. Only PDF and Word (.docx) files are supported.`)
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File is too large (limit 100 MB).')
      return
    }
    fileRef.current = file
    setFileName(file.name)
    setBusy(true)
    setStatus('Reading file…')
    try {
      const buf = await file.arrayBuffer()
      const key = apiKeyInput.trim() || null
      if (key) storeKey(key)
      const result = await processDocument(buf, file.name, key, { onProgress: (msg: string) => setStatus(msg) })
      if (key) storeKey(key) // remember a working key
      setIssues(result.issues)
      setWarnings(result.warnings)
      setPendingBank(result.bank)
      const via =
        result.mode === 'groq' ? 'Groq AI' :
        result.mode === 'mixed' ? 'Groq AI + built-in parser' : 'the built-in parser'
      setStatus(
        `Extracted ${result.bank.questions.length} questions from ${result.pageCount} page(s) using ${via}.` +
          (result.issues.length || result.warnings.length
            ? ` ${result.issues.length + result.warnings.length} note(s) below.`
            : '')
      )
    } catch (e: any) {
      if (e?.scannedPdf) {
        setError(
          'No selectable text was found — this PDF appears to be a scan of images. ' +
            'Text-based PDFs and .docx files are supported; scanned/image PDFs cannot be processed in this version.'
        )
      } else if (e instanceof GroqError && (e.status === 401 || e.status === 403)) {
        setError('Your Groq API key was rejected (401/403). Check the key at console.groq.com and try again — or clear it to use the built-in parser.')
      } else {
        setError(`Extraction failed: ${e?.message ?? String(e)}`)
      }
      setFileName(null)
      fileRef.current = null
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!pendingBank) return
    await putBank(pendingBank)
    props.onDone(pendingBank.id)
  }

  const retry = () => {
    setError(null)
    setIssues(null)
    setWarnings(null)
    setPendingBank(null)
    setFileName(null)
    if (fileRef.current) inputRef.current?.click()
  }

  return (
    <>
      <div className="topbar">
        <h1>Upload questions</h1>
        <button className="btn secondary" onClick={props.onCancel}>Back</button>
      </div>

      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) validate(f)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="big">Drag & drop a PDF or Word file here</div>
        <div>or click to choose a file (.pdf or .docx)</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,.docx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) validate(f)
          e.target.value = ''
        }}
      />

      <div className="card" style={{ marginTop: 12 }}>
        <label htmlFor="groq-key" style={{ fontWeight: 600 }}>
          Groq API key <span className="muted" style={{ fontWeight: 400 }}>(recommend for messy PDFs)</span>
        </label>
        <div className="row" style={{ marginTop: 6 }}>
          <input
            id="groq-key"
            type={showKey ? 'text' : 'password'}
            placeholder="gsk_… (get one free at console.groq.com)"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            style={{ flex: 1 }}
            autoComplete="off"
          />
          <button type="button" className="btn secondary small" onClick={() => setShowKey((s) => !s)}>
            {showKey ? 'Hide' : 'Show'}
          </button>
          {getStoredKey() && (
            <button
              type="button"
              className="btn subtle small"
              onClick={() => { clearStoredKey(); setApiKeyInput('') }}
              title="Remove the saved key from this browser"
            >
              Forget key
            </button>
          )}
        </div>
        <div className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>
          The key is used only from your browser (kept in localStorage, never bundled or sent anywhere but Groq).
          Leave blank to use the built-in parser.
        </div>
      </div>

      {fileName && <div className="muted" style={{ marginTop: 10 }}>File: {fileName}</div>}
      {busy && <div className="info-box">{status || 'Working…'}</div>}
      {!busy && status && pendingBank && <div className="info-box">{status}</div>}

      {error && (
        <div className="error-box">
          {error}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn secondary small" onClick={retry}>Try another file</button>
          </div>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>Notes ({warnings.length})</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            {warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {issues && issues.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2 style={{ marginTop: 0 }}>Extraction issues ({issues.length})</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
            {issues.slice(0, 10).map((iss, i) => (
              <li key={i}>{iss.message}</li>
            ))}
            {issues.length > 10 && <li>… and {issues.length - 10} more (visible on the question editor).</li>}
          </ul>
        </div>
      )}

      {pendingBank && (
        <>
          {(issues?.length ?? 0) + (warnings?.length ?? 0) > 0 && (
            <p className="warn-text">
              You can review before practising, or continue now and fix issues later in the question editor.
            </p>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={save} disabled={busy}>Save & continue</button>
            <button
              className="btn secondary"
              onClick={() => {
                if (pendingBank.id) putBank(pendingBank).then(() => { props.onDone(pendingBank.id, true) })
              }}
            >
              Save & review questions
            </button>
          </div>
        </>
      )}
    </>
  )
}
