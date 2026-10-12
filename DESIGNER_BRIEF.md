# UI Redesign Brief — MCQ Practice

**For:** UI designer
**Product:** MCQ Practice — turn any MCQ PDF/Word file into an interactive practice test
**Live reference:** current app is deployed and can be walked through on request; this document describes every screen that exists today plus a new landing page.

---

## 1. Product in one paragraph

A student uploads a PDF or Word (.docx) file containing multiple-choice questions.
The app reads it, extracts every question with its options and the correct answer
(using AI), splits the bank into batches of 10, and lets the student practise with
**instant Correct!/Incorrect! feedback after every click** — answers lock, a running
score is always visible, and a batch summary appears at the end. No accounts, no
backend: everything runs and is stored in the user's own browser. Free.

**Target users:** exam-prep students (competitive exams, university courses,
certifications), self-studiers, and tutors handing out practice files.

**Personality:** calm, focused, trustworthy. It's a study tool used for long
sessions — legibility first, no gamification clutter, no fake "AI magic" hype.
Think clean productivity tool, not loud edtech.

---

## 2. Screens to design (9 total: 1 landing + 8 app screens)

Open question for you (designer): we'd like the landing page designed as part of
the same visual system as the app so both feel like one product.

---

### 2.1 Landing page (NEW — primary deliverable)

**Purpose:** convert a visitor into "upload your first PDF" in one scroll.

**Sections (top to bottom):**

1. **Nav:** wordmark/logo + 2 quiet links (How it works, FAQ) + primary CTA button "Upload your PDF".
2. **Hero:**
   - H1: **"Turn any MCQ PDF into a practice test."**
   - Sub: "Upload your question bank — we extract the questions, batch them into sets of 10, and score you instantly as you practise. No account. Your files never leave your browser."
   - Primary CTA: **Upload your first PDF** · secondary: *How it works ↓*
   - Hero visual idea: a PDF page transforming into a stack of question cards (PDF icon → arrow → 3 overlapping question cards, one showing "✓ Correct!").
3. **How it works — 3 steps in one row:**
   1. Upload — Drop in a PDF or Word file
   2. Practise — Answer in batches of 10 with instant feedback
   3. Score — Correct/incorrect summary + retry what you got wrong
4. **Live UI proof — 3 framed screenshots** (I'll supply real screenshots; design frames around them): upload dropzone → dashboard with batch cards → practice screen with green "✓ Correct!" state.
5. **Feature strip (6 tiles):**
   - Automatic extraction (PDF & Word)
   - Batches of 10
   - Instant right/wrong feedback
   - Answers never leak before you click
   - Progress saved automatically
   - Private by design — 100% in your browser
6. **Privacy block:** shield/lock visual + "Your PDF never leaves your browser." One honest caveat: text-based PDFs only (scanned images not supported).
7. **FAQ (4 items, accordion style):** Do I need an account? (No) · Where is my data stored? (Only in your browser) · Does it work with scanned PDFs? (No — text PDFs and .docx) · Is it free? (Yes).
8. **Final CTA band:** repeat "Upload your first PDF".
9. **Footer:** minimal — wordmark, "Made for self-study", no legal clutter needed yet.

**Tone:** whitespace-heavy, one accent color, motion restrained (subtle hover/scroll reveals max). Mobile-first: over half of students will open this on phones.

---

### 2.2 My Question Banks (home / first screen of the app)

- Top bar: page title "My Question Banks" + primary button "+ Add PDF".
- Empty state (important to design): friendly illustration, "No question banks yet", one CTA.
- Bank cards in a responsive grid. Each card shows: bank name (click to open), "N questions · M batches", "X answered · Y% accuracy" (or "no graded answers yet"), and three actions: **Open** (primary), **Rename**, **Delete** (destructive-styled).
- Two modals used here (design both): **Rename bank** (input + Save/Cancel) and **Delete confirmation** (warning copy + Delete/Cancel).

### 2.3 Upload

- Top bar: "Upload questions" + Back.
- Large dashed **dropzone**: "Drag & drop a PDF or Word file here / or click to choose a file (.pdf or .docx)". Drag-over state gets highlighted.
- **Groq API key card** below the dropzone: password input with Show/Hide + "Forget key" (only when saved) + helper text: "The key is used only from your browser (kept in localStorage). Leave blank to use the built-in parser." This is a technical detail — keep it visually quiet/collapsible if you prefer.
- While processing: **status/info box** with live progress text (e.g. "Extracting text from PDF — page 3 of 12…", "Asking Groq (1 of 2)…").
- After success: info box with result summary ("Extracted 12 questions from 2 pages…") + **notes/issues list** when extraction flagged something (numbered, max 10, "+ N more" link) + warn text "You can review before practising…" + buttons **Save & continue** (primary) / **Save & review questions** (secondary).
- Error state: red error box with "Try another file" button. Scanned-PDF error is a distinct message (image-only file detected).

### 2.4 Dashboard (per-bank)

- Top bar: bank name + subtitle "12 questions · 2 batches · batch size 10"; actions **Edit questions** and **All banks**.
- Stats card: 4 big-number stats — Total / Answered / Remaining / Accuracy — plus actions row: **Practise All Questions** (primary), **Practise Unanswered**, **Retry Incorrect** (disabled when none).
- **Batch cards grid** (design the core one): each card = "Batch 1", range "Questions 1–10", status badge **Not started / In progress / Completed**, "N answered, M remaining", checkbox "select", and one button whose label changes: Start Practice / Resume Practice / View Results. Multi-select at top reveals "Practise 2 selected batches".
- micro-interaction to design: status badge color shifts (grey → amber → green).

### 2.5 Practice (the money screen)

One question at a time, narrow centered column (reads like flashcards/exam).

- Top bar: session label "Batch 1" + "Question 4 of 10 · 3 answered" + **Exit**.
- Thin progress bar under the top bar.
- Question card: small muted line ("Question 3 · p. 1"), the question text large, then option rows. Each option: letter chip (A/B/C/D) + text, full-width row button, hover raises border.
- **Locked/feedback states (must design all four):**
  1. Default (unanswered): neutral rows, clickable.
  2. Correct pick clicked: chosen row turns **green**, banner "✓ Correct!", all rows disabled, wrong rows dimmed.
  3. Wrong pick clicked: chosen row turns **red**, correct row revealed **green**, banner "✗ Incorrect! Correct answer: C", all disabled.
  4. Ungraded (no key in the source file): neutral banner "Answer saved: B — no verified answer key for this question."
- **Running score bar** under the card: "● 7 correct ● 2 incorrect · 0 without key" with colored dots.
- Question navigator: numbered grid of small buttons under the card, colour-coded by outcome (green=correct, red=wrong, blue=answered-no-key, outline=unanswered, ring=current). This is used to jump between questions.
- Buttons: ← Prev, Clear answer (disabled once locked), Next →; last question shows **Finish**. Separate quieter "Finish / Summary" button.
- **End-of-session summary modal:** "Batch 1 — Summary" with 4 stats (Total / Correct / Incorrect / No key) + buttons **See detailed results** / **Keep practising**.
- Footnote: "Answers lock as soon as you click — correctness is shown immediately."

### 2.6 Results

- Top bar: "Batch 1 — Results" + Dashboard link.
- Score card: huge percentage (80% style) + caption; stat row Total / Answered / Correct (green) / Incorrect (red) / Unanswered (amber).
- Action row: **Retry Incorrect** (primary), Retry this batch, Next batch (when applicable), Practise All.
- **Answer review list:** one row per question — verdict chip (✔ Correct / ✘ Incorrect / — Unanswered / · Ungraded), truncated question, sub-line "Your answer: B · Correct answer: C". Colour-coded left accent per row.

### 2.7 Edit questions

- Top bar: "Edit questions" + "N questions · M without answer key" + **Done**.
- Search input (question text or number), info box when unknown keys exist, buttons **Jump to first missing key** and **+ Add question**.
- **Question editor card** (one per question, autosaves silently): "Question N" + Delete; multi-line textarea for the statement; four lettered option textareas; correct-answer A/B/C/D chips (selected chip green; click again = unknown); "Source: p. 3" footnote. Design needs graceful long-text and vertical rhythm for 100+ cards.
- Modal: none (deletes are immediate here — could propose an undo toast instead, your call).

### 2.8 Global components

Also design once, reuse everywhere (currently ad-hoc):
- Buttons: primary / secondary (outline) / subtle / small / destructive.
- Cards, modals + backdrop, error box (red), info box (blue), warn text.
- Inputs & textareas, checkboxes, the dashed dropzone with drag-over state.
- Stat blocks (big number + label).
- Toasts (not yet implemented — propose if you think useful).

---

## 3. Design tokens (current state — free to redesign, must stay legible)

- Colors: bg `#f4f5f7`, surface `#ffffff`, border `#dfe2e8`, text `#1a1d23`, muted `#6b7280`, accent blue `#2563eb`, success `#16a34a`, danger `#dc2626`, warning `#d97706`.
- Radius 10px (cards/buttons), 14px (modals/dropzone).
- Type: system sans (Segoe UI/system stack). Please propose a real typeface pairing for headings + body (student-friendly, excellent at long sessions, good old numerals for stats). Dark mode would be a welcome bonus.
- **Semantic colors are functional, not style:** green/red MUST stay unambiguous — students act on them instantly.

## 4. Constraints & honest claims (do not contradict these in copy)

- No accounts, ever. No server. Data lives in the user's browser (IndexedDB) — refresh-proof, per-device.
- PDF upload only (plus .docx); scanned/image PDFs are NOT supported — say so in FAQ/empty states.
- Groq AI is used for extraction when the student supplies their own free API key; the key stays in their browser.
- Buttons must work at 44px+ touch height on mobile; the practice screen is the most-used view — optimize for it.
- Deliverables: Figma file (or high-fidelity HTML/CSS), desktop + mobile for every screen above, plus the landing page in both breakpoints; light/dark if you take on dark mode.

## 5. Content voice

Encouraging but not gaming: "✓ Correct!" is enough; no confetti/sparkles. Microcopy
should be short, plain, and honest (e.g. accuracy captions say "based on 9 graded answers",
not "You're amazing!").
