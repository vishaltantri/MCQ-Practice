import { useState } from 'react'
import type { Screen } from '../App'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need an account to use MCQ Practice?',
    a: 'No. There is no sign-up, email, password or credit card anywhere in the app. Open the page, upload a PDF and start practising.',
  },
  {
    q: 'Where is my data stored?',
    a: "In this browser only, inside sandboxed IndexedDB storage — questions, answers, history and your Groq key. It survives refreshes but lives on this device and this browser profile. Clearing the site's data resets everything.",
  },
  {
    q: 'Do I need an LLM API key?',
    a: 'No. Without a key the built-in parser reads clean, text-based PDFs on its own. A free Groq key is recommended for messy layouts — multi-column sheets, mixed numbering, tables — because the model handles them far more reliably.',
  },
  {
    q: 'Which model does it use, and what does it cost?',
    a: "Groq's chat model \"openai/gpt-oss-20b\", called directly from your browser. Groq has a generous free tier, so for typical study-sized files (a few hundred questions) you will usually pay nothing — check console.groq.com for the current limits.",
  },
  {
    q: 'Is it safe to paste my API key here?',
    a: 'The key is written to this browser\'s localStorage only, and is sent in exactly one place: straight from your browser to https://api.groq.com. There is no server in this app that could receive it, and it is never bundled into the JavaScript. Use "Forget key" on the upload screen to delete it at any time.',
  },
  {
    q: 'Can I use an OpenAI, Anthropic or Gemini key?',
    a: 'Not directly — the app speaks the OpenAI-compatible Chat Completions API exposed by Groq. Keys from other providers will be rejected (401/403). Without a Groq key the built-in parser still works.',
  },
  {
    q: 'Does it work with scanned or photo-only PDFs?',
    a: 'No. The engine needs selectable text. Run scanned pages through OCR first (Adobe Acrobat, Google Drive, or any OCR tool), export a text PDF, then upload it.',
  },
  {
    q: 'What does "ungraded" mean in my results?',
    a: 'The source file had no answer key the parser could verify for that question. It is still counted as answered, but not in the accuracy percentage. Open Edit questions and click the correct A/B/C/D chip to grade it.',
  },
  {
    q: 'How do I delete everything?',
    a: 'Delete individual banks from the Question Banks screen (Delete → confirm). To wipe everything at once, clear this site\'s data in your browser settings — banks, answers, history and the saved API key all go with it.',
  },
]

export function DocsScreen(props: { onGo: (s: Screen) => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <div className="docs">
      <div className="topbar">
        <div>
          <h1>Documentation &amp; FAQ</h1>
          <div className="muted">
            How extraction works, how to plug in an LLM API key, and answers to common questions.
          </div>
        </div>
        <button className="btn" onClick={() => props.onGo({ name: 'upload' })}>Upload a PDF</button>
      </div>

      {/* ============ HOW IT WORKS ============ */}
      <section className="docs-section">
        <h2>How it works</h2>
        <p className="docs-lead">
          Everything runs inside this browser tab. A file you upload is parsed locally (or sent, only
          if you choose, to Groq for AI extraction) and the results are stored in IndexedDB on this device.
        </p>
        <div className="docs-grid">
          <div className="card">
            <strong>1 · Upload</strong>
            <p className="muted">
              Drop a text-based PDF or a Word (.docx) file on the Upload screen. Scanned/image-only
              PDFs are detected and rejected with a clear error.
            </p>
          </div>
          <div className="card">
            <strong>2 · Extract</strong>
            <p className="muted">
              Questions, options and the answer key are extracted by the built-in parser, or by Groq
              AI when you supply an API key. Every run reports which mode was used.
            </p>
          </div>
          <div className="card">
            <strong>3 · Practise</strong>
            <p className="muted">
              The bank is split into batches of 10. Clicking an option grades it instantly and locks
              the question; a live score and a colour-coded navigator follow you through the batch.
            </p>
          </div>
          <div className="card">
            <strong>4 · Review &amp; retry</strong>
            <p className="muted">
              Results show the big score, a per-question review list, and one-click Retry Incorrect.
              Anything the parser got wrong can be fixed in the question editor.
            </p>
          </div>
        </div>
      </section>

      {/* ============ LLM API KEY GUIDE ============ */}
      <section className="docs-section">
        <h2>Adding an LLM API key (Groq)</h2>
        <p className="docs-lead">
          Optional but recommended for messy PDFs. Groq gives away free API keys, and the key never
          leaves your browser. Five minutes, once:
        </p>
        <ol className="doc-steps">
          <li>
            <strong>Create the key.</strong> Go to{' '}
            <a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a>,
            sign in (free, no card), open <strong>API Keys</strong> in the sidebar and press{' '}
            <strong>Create API key</strong>. Name it something like <code>mcq-practice</code>.
          </li>
          <li>
            <strong>Copy it immediately.</strong> The key starts with <code>gsk_</code> and is shown
            only once — paste it somewhere safe (a password manager) in case you lose the tab.
          </li>
          <li>
            <strong>Open the Upload screen.</strong> Click <strong>Add PDF</strong> in the header.
            The <strong>Groq API key</strong> card sits right under the dropzone.
          </li>
          <li>
            <strong>Paste it and verify.</strong> Paste into the password field, press{' '}
            <strong>Show</strong> if you want to eyeball it. The key is saved to this browser, so
            next time it is pre-filled automatically.
          </li>
          <li>
            <strong>Upload your file.</strong> Status text will say it is sending chunks to Groq;
            the result line tells you whether the questions came from <em>Groq AI</em>, the{' '}
            <em>built-in parser</em>, or a mix of both.
          </li>
        </ol>
        <div className="info-box">
          <strong>What the key can and cannot do.</strong> It is stored in this browser's
          localStorage and sent only to <code>https://api.groq.com</code> from your own machine.
          Nothing routes through us — the app has no server. Press <strong>Forget key</strong> on
          the Upload screen to remove it, or leave the field blank to always use the built-in parser.
        </div>

        <h3>Parser vs. Groq AI</h3>
        <div className="docs-grid">
          <div className="card">
            <strong>Built-in parser (no key)</strong>
            <ul className="muted docs-list">
              <li>Fully offline — text never leaves the tab</li>
              <li>Great on clean, single-column exam PDFs</li>
              <li>Detects A/B/C/D options and embedded answer keys</li>
              <li>Flags anything ambiguous in the issues list</li>
            </ul>
          </div>
          <div className="card">
            <strong>Groq AI (free API key)</strong>
            <ul className="muted docs-list">
              <li>Handles multi-column layouts, tables and odd numbering</li>
              <li>Re-reads garbled text and repairs split questions</li>
              <li>Automatic retries, then a transparent fall back to the parser</li>
              <li>Document text is sent to api.groq.com for processing</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ============ TROUBLESHOOTING ============ */}
      <section className="docs-section">
        <h2>Troubleshooting</h2>
        <div className="docs-grid">
          <div className="docs-trouble">
            <strong>"Your Groq API key was rejected (401/403)"</strong>
            <p className="muted">
              The key is wrong, revoked or expired. Create a fresh one at console.groq.com and paste
              it again — or press <strong>Forget key</strong> and rely on the built-in parser.
            </p>
          </div>
          <div className="docs-trouble">
            <strong>"No selectable text was found"</strong>
            <p className="muted">
              The PDF is a scan or a flattened image. OCR it first (Acrobat, Google Drive, or any
              OCR tool), save as a text PDF, then re-upload.
            </p>
          </div>
          <div className="docs-trouble">
            <strong>Extraction issues list</strong>
            <p className="muted">
              Each note explains what the engine was unsure about. Choose{' '}
              <strong>Save &amp; review questions</strong> to land straight in the editor and fix
              stems, options or the answer key.
            </p>
          </div>
          <div className="docs-trouble">
            <strong>Questions with no answer key</strong>
            <p className="muted">
              They are marked <em>ungraded</em> in results (excluded from accuracy). Set the key in
              the editor — the yellow banner tells you how many are affected.
            </p>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="docs-section">
        <h2>Frequently asked questions</h2>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div className="faq-item" key={i}>
              <button
                className="faq-q"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{f.q}</span>
                <span className={`chev ${openFaq === i ? 'open' : ''}`}>expand_more</span>
              </button>
              {openFaq === i && <div className="faq-a">{f.a}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
