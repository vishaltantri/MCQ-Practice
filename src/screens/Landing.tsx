import { useRef, useState } from 'react'
import type { Screen } from '../App'

/* Material Symbols helpers — keep names identical to the designer's code.html */
const Ic = ({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) => (
  <span className="material-symbols-outlined" style={{ fontSize: size, ...style }} aria-hidden>
    {name}
  </span>
)

const FAQS = [
  {
    q: 'Do I need an account to use MCQ Practice?',
    a: 'No. You will never be asked for an email address, password, credit card, or social login. The tool operates as a pure local web application. You can bookmark the page and access it completely offline.',
  },
  {
    q: 'Where is my practice data and PDF stored?',
    a: "Exclusively on your computer or mobile device. We store questions and your session progress in your browser's sandboxed IndexedDB storage. Clearing your browser cookies/site storage will reset your local database.",
  },
  {
    q: 'Does it work with scanned, photo-only PDFs?',
    a: 'No. The engine requires selectable, digital text inside the PDF or Word document to parse questions. If your PDF is composed of scanned photos or flattened images, run it through an OCR tool (like Adobe Acrobat or Google Drive OCR) first.',
  },
  {
    q: 'Is MCQ Practice really 100% free?',
    a: "Yes. There are no paywalls, premium tiers, or limits on the number of questions you can practise. The application runs entirely on your device's CPU, meaning zero server hosting costs for processing your files.",
  },
]

/** Landing page — 1:1 conversion of the designer's code.html ("Academic Clarity"). */
export function LandingScreen(props: {
  onGo: (s: Screen) => void
  onPickFile: (file: File) => void
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const pick = (f: File | undefined) => { if (f) props.onPickFile(f) }

  const scrollTo = (id: string) =>
    rootRef.current?.querySelector<HTMLElement>(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="landing" ref={rootRef}>
      {/* Designer's exact fixed header (landing variant) */}
      <LandingHeader onGo={props.onGo} scrollUpload={() => scrollTo('upload-dropzone')} />

      {/* ============ HERO ============ */}
      <div className="landing-hero-wrap">
        <div className="hero-blobs" aria-hidden />
        <div className="landing-container">
          <section className="landing-section" style={{ paddingTop: 'var(--space-md)' }}>
            <div className="hero">
              {/* Left column */}
              <div className="hero-copy">
                <div className="tag-pill">
                  <Ic name="verified_user" size={16} />
                  <span>Zero telemetry • 100% Client-Side Engine</span>
                </div>
                <h1>Turn any MCQ PDF into an interactive practice test.</h1>
                <p className="hero-sub">
                  Upload your question bank — we extract the questions, batch them into sets of 10, and score
                  you instantly as you practise. No account. Your files never leave your browser.
                </p>
                <div className="hero-ctas">
                  <button className="btn-hero" onClick={() => scrollTo('upload-dropzone')}>
                    <Ic name="upload_file" size={20} />
                    <span>Upload your first PDF</span>
                  </button>
                  <button className="btn-hero-ghost" onClick={() => scrollTo('how-it-works')}>
                    <span>How it works</span>
                    <Ic name="south" size={18} />
                  </button>
                </div>
                <div className="hero-checks">
                  <span><Ic name="check" size={18} />PDF &amp; Word (.docx)</span>
                  <span><Ic name="check" size={18} />No sign-up required</span>
                  <span><Ic name="check" size={18} />Offline-ready</span>
                </div>
              </div>

              {/* Right column: PDF → question card transformation */}
              <div className="hero-visual">
                <div className="pdf-pill">
                  <div className="hrow" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div className="pdf-icon"><Ic name="description" size={24} /></div>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span className="pdf-name">Cell_Biology_Exam_2024.pdf</span>
                      <span className="pdf-meta">142 Multiple Choice Questions</span>
                    </div>
                  </div>
                  <span className="badge-ok">Ready</span>
                </div>

                <div className="hero-arrow">
                  <div className="arrow-circle"><Ic name="arrow_downward" size={20} /></div>
                </div>

                <div className="hero-stack">
                  <div className="layer-back" aria-hidden />
                  <div className="layer-mid" aria-hidden />
                  <div className="hero-question">
                    <div className="hq-top">
                      <span>QUESTION 4 OF 10</span>
                      <span className="badge-ok"><Ic name="check_circle" size={14} />Correct!</span>
                    </div>
                    <div className="hq-stem">
                      Which organelle is primarily responsible for ATP synthesis in eukaryotic cells?
                    </div>
                    <div className="hq-option">
                      <span className="key">A</span>
                      <span>Endoplasmic reticulum</span>
                    </div>
                    <div className="hq-option answered">
                      <span className="key">B</span>
                      <span className="hq-text">Mitochondria</span>
                      <Ic name="check" size={18} />
                    </div>
                    <div className="hq-option">
                      <span className="key">C</span>
                      <span>Golgi apparatus</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ HOW IT WORKS ============ */}
          <section className="landing-section" id="how-it-works">
            <div className="section-head">
              <span className="section-label">Streamlined Workflow</span>
              <h2>Three steps to confident mastery</h2>
              <p className="sub">No complex setup. From raw document to focused practice in less than five seconds.</p>
            </div>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-top">
                  <div className="step-num">01</div>
                  <Ic name="file_upload" size={24} />
                </div>
                <div>
                  <h3>Upload</h3>
                  <p>Drop in a PDF or Word file. Our in-browser parser automatically splits stems, choices, and answers without touching a server.</p>
                </div>
              </div>
              <div className="step-card">
                <div className="step-top">
                  <div className="step-num">02</div>
                  <Ic name="quiz" size={24} />
                </div>
                <div>
                  <h3>Practise</h3>
                  <p>Answer in manageable batches of 10. Get immediate visual feedback on each choice without spoilers or artificial timers.</p>
                </div>
              </div>
              <div className="step-card">
                <div className="step-top">
                  <div className="step-num">03</div>
                  <Ic name="auto_graph" size={24} />
                </div>
                <div>
                  <h3>Score</h3>
                  <p>Review detailed correct/incorrect summaries, inspect full explanations, and immediately retry questions you missed.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ============ LIVE UI PROOF (browser-chrome mockups) ============ */}
          <section className="landing-section">
            <div className="section-head">
              <span className="section-label">Interface Reality</span>
              <h2>Designed for deep, uninterrupted study</h2>
              <p className="sub">Explore the clean, distraction-free screens built for long preparation marathons.</p>
            </div>
            <div className="mockup-grid">
              {/* Mockup 1 — upload dropzone */}
              <div className="mockup">
                <div className="browser-chrome">
                  <span className="dots"><span /><span /><span /></span>
                  <span className="url">mcqpractice.app/upload</span>
                  <Ic name="lock" size={16} />
                </div>
                <div className="frame">
                  <div className="inner-dz">
                    <div className="cloud"><Ic name="cloud_upload" size={28} /></div>
                    <span className="inner-t1">Drag &amp; Drop Question Bank</span>
                    <span className="inner-t2">Supports .PDF, .DOCX, and scanned text files</span>
                    <span className="browse-chip">Browse Local Storage</span>
                  </div>
                </div>
                <div className="mockup-caption">
                  <h4>1. Instant Document Parser</h4>
                  <p>Drop any formatted exam file. Extraction completes client-side without lag.</p>
                </div>
              </div>

              {/* Mockup 2 — bank dashboard */}
              <div className="mockup">
                <div className="browser-chrome">
                  <span className="dots"><span /><span /><span /></span>
                  <span className="url">mcqpractice.app/banks</span>
                  <Ic name="dashboard" size={16} />
                </div>
                <div className="frame">
                  <div className="mini-dash">
                    <div className="dash-head">
                      <span className="name">Neurology Board Exam</span>
                      <span className="qs">60 Qs</span>
                    </div>
                    <div className="mini-batch">
                      <div>
                        <span className="b-name">Batch 01 (Q1 - 10)</span>
                        <span className="b-status completed">Completed • 90% (9/10)</span>
                      </div>
                      <Ic name="check_circle" size={20} />
                    </div>
                    <div className="mini-batch">
                      <div>
                        <span className="b-name">Batch 02 (Q11 - 20)</span>
                        <span className="b-status progress">In Progress • 4/10</span>
                      </div>
                      <span className="resume-chip">Resume</span>
                    </div>
                    <div className="mini-batch dimmed">
                      <div>
                        <span className="b-name">Batch 03 (Q21 - 30)</span>
                        <span className="b-status unstarted">Unstarted</span>
                      </div>
                      <Ic name="play_circle" size={20} />
                    </div>
                  </div>
                </div>
                <div className="mockup-caption">
                  <h4>2. Ten-Question Batches</h4>
                  <p>Conquer vast question databases in focused, manageable 10-problem increments.</p>
                </div>
              </div>

              {/* Mockup 3 — active practice */}
              <div className="mockup">
                <div className="browser-chrome">
                  <span className="dots"><span /><span /><span /></span>
                  <span className="url">mcqpractice.app/session</span>
                  <Ic name="check_circle" size={16} style={{ color: 'var(--secondary)' }} />
                </div>
                <div className="frame">
                  <div className="practice-inner">
                    <div className="pi-top">
                      <span>Card #7 of 10</span>
                      <span className="badge-ok"><Ic name="check" size={14} />✓ Correct!</span>
                    </div>
                    <div className="pi-stem">Primary cranial nerve innervating the tongue muscles?</div>
                    <div className="pi-option correct">
                      <span>C. Hypoglossal (CN XII)</span>
                      <Ic name="verified" size={18} />
                    </div>
                    <div className="pi-option neutral">
                      <span>D. Vagus (CN X)</span>
                    </div>
                  </div>
                  <div className="pi-feedback">
                    <span>Feedback: Accurate recall!</span>
                    <Ic name="arrow_forward" size={18} />
                  </div>
                </div>
                <div className="mockup-caption">
                  <h4>3. Immediate Evaluation</h4>
                  <p>Zero spoiler risk. Instant binary feedback the second you click your choice.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ============ FEATURE STRIP ============ */}
          <section className="landing-section">
            <div className="section-head">
              <span className="section-label">Features</span>
              <h2>Engineered for pure cognitive retention</h2>
              <p className="sub">Built specifically for high-stakes exam prep: medicine, law, engineering, and finance.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="f-icon"><Ic name="difference" size={24} /></div>
                <h3>Automatic Extraction</h3>
                <p>Advanced semantic heuristics instantly detect question stems, answer keys, and options from both PDF and Word (.docx) documents.</p>
              </div>
              <div className="feature-card">
                <div className="f-icon"><Ic name="view_carousel" size={24} /></div>
                <h3>Batches of 10</h3>
                <p>Multi-hundred question PDFs are automatically chunked into bite-sized 10-card sets to maintain focus and prevent study burnout.</p>
              </div>
              <div className="feature-card">
                <div className="f-icon green"><Ic name="bolt" size={24} /></div>
                <h3>Instant Right/Wrong</h3>
                <p>Binary feedback reveals the validated answer immediately with precise color cues, allowing instant consolidation of memory pathways.</p>
              </div>
              <div className="feature-card">
                <div className="f-icon"><Ic name="visibility_off" size={24} /></div>
                <h3>Zero Answer Leakage</h3>
                <p>Correct options remain strictly encrypted in memory until the interaction event is registered. No accidental glance spoilers.</p>
              </div>
              <div className="feature-card">
                <div className="f-icon"><Ic name="save" size={24} /></div>
                <h3>Progress Saved Locally</h3>
                <p>Close your browser tab or reboot your machine anytime. Your question batches, answers, and metrics persist safely in IndexedDB.</p>
              </div>
              <div className="feature-card">
                <div className="f-icon green"><Ic name="shield" size={24} /></div>
                <h3>Private by Design</h3>
                <p>100% in-browser processing. Proprietary question banks, university quizzes, and personal drafts never touch external servers.</p>
              </div>
            </div>
          </section>

          {/* ============ PRIVACY BLOCK ============ */}
          <section className="landing-section">
            <div className="privacy-block">
              <div className="glow" aria-hidden />
              <div className="privacy-inner">
                <div className="shield"><Ic name="enhanced_encryption" size={54} /></div>
                <div>
                  <span className="arch-pill">Client-Side Architecture</span>
                  <h2>Your PDF never leaves your browser.</h2>
                  <p className="lede">
                    Unlike online converters that upload your confidential documents to cloud APIs, MCQ Practice
                    runs a WebAssembly parser directly inside your local browser runtime. Zero logs, zero analytics
                    cookies, zero cloud syncing.
                  </p>
                  <div className="privacy-note">
                    <Ic name="info" size={20} />
                    <span>
                      <strong>Honest compatibility note:</strong> Text-based PDFs and native Word (.docx)
                      documents are fully supported. Scanned, flattened image-only PDFs require pre-OCR
                      processing before import.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ INTERACTIVE DROPZONE ============ */}
          <section
            className="landing-section"
            id="upload-dropzone"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              pick(e.dataTransfer.files?.[0])
            }}
          >
            <div className="upload-cta">
              <div className="section-head" style={{ marginBottom: 0 }}>
                <h2>Ready to practise right now?</h2>
                <p className="sub">No account needed. Drop your file below to start an interactive test session immediately.</p>
              </div>
              <div
                className={`dropzone compact ${dragOver ? 'dragover' : ''}`}
                style={{ minHeight: 220 }}
                onClick={() => inputRef.current?.click()}
                role="button"
                aria-label="Upload PDF or Word document"
              >
                <div className="dz-icon"><Ic name="folder_zip" size={32} /></div>
                <div className="big">Drop your PDF or Word document here</div>
                <div>or click to browse local files from your device</div>
                <div className="privacy-chip">100% Private • IndexedDB Local Cache</div>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf,.docx"
                style={{ display: 'none' }}
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }}
              />
            </div>
          </section>

          {/* ============ FAQ ============ */}
          <section className="landing-section">
            <div className="section-head">
              <span className="section-label">Common Questions</span>
              <h2>Frequently Asked Questions</h2>
              <p className="sub">Clear answers regarding local operation, privacy guarantees, and supported formats.</p>
            </div>
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

          {/* ============ FINAL CTA ============ */}
          <section className="landing-section">
            <div className="cta-band">
              <div className="cta-icon"><Ic name="menu_book" size={32} /></div>
              <h2>Start your distraction-free practice session.</h2>
              <p>Zero sign-ups. No credit card. Transform your exam preparation notes into clean practice test batches right now.</p>
              <button className="btn-white" onClick={() => scrollTo('upload-dropzone')}>
                <Ic name="upload_file" size={22} />
                <span>Upload your first PDF</span>
              </button>
              <div className="perks">
                <span><Ic name="lock" size={16} />Zero Server Uploads</span>
                <span>•</span>
                <span><Ic name="bolt" size={16} />Instant Extraction</span>
              </div>
            </div>
          </section>

          {/* ============ FOOTER STRIP + FOOTER ============ */}
          <div className="footer-strip">
            <div className="fs-links">
              <span className="fs-brand">MCQ Practice</span>
              <span className="dot-sep">•</span>
              <span>Made for deliberate self-study</span>
            </div>
            <div className="fs-links">
              <span>Offline-first execution</span>
              <span className="dot-sep">•</span>
              <span>IndexedDB Storage</span>
            </div>
          </div>
        </div>

        <footer className="site-footer">
          <div className="inner">
            <div>© 2025 MCQ Practice. Offline-first private educational tool.</div>
            <div className="fs-links">
              <span>Help Center</span>
              <span className="dot-sep">•</span>
              <span>Zero telemetry • Browser sandbox storage</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Landing's hidden file input is defined above; drop/click both route into the app */}
    </div>
  )
}

/** The designer's exact fixed header shown on the landing page:
 *  logo + wordmark + "Local & Private" chip + nav links on the left;
 *  IndexedDB sync chip + "Add PDF" button + profile avatar on the right. */
function LandingHeader(props: {
  onGo: (s: Screen) => void
  scrollUpload: () => void
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-left">
          <button
            className="brand"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img className="brand-logo" src="/logo.png" alt="MCQ Practice Logo" />
            <span>MCQ Practice</span>
          </button>
          <span className="brand-pill">Local &amp; Private</span>
          <nav className="site-nav">
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); props.onGo({ name: 'banks' }) }}
            >
              Question Banks
            </a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); props.scrollUpload() }}>
              Upload
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); props.onGo({ name: 'docs' }) }}>Documentation &amp; FAQ</a>
          </nav>
        </div>
        <div className="site-header-right">
          <div className="sync-chip">
            <span className="material-symbols-outlined">sync</span>
            <span>IndexedDB Local Storage (Synced)</span>
          </div>
          <button className="btn" onClick={props.scrollUpload}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            <span>Add PDF</span>
          </button>
          <img className="header-avatar" src="/avatar.png" alt="Profile" />
        </div>
      </div>
    </header>
  )
}
