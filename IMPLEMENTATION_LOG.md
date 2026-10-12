# Implementation Log — MCQ Practice App

## Status: Complete (all Definition-of-Done items verified)

Final state: 32/32 tests pass, `tsc --noEmit` clean, `vite build` succeeds,
full upload→practice→results loop verified in a real browser on both the dev
server and the production build.

---

## Architecture

- **Vite 7 + React 19 + TypeScript 5.9** SPA, fully client-side (no backend).
- **pdfjs-dist 6.x (legacy build)** for PDF text extraction. The legacy build was
  chosen because the modern build requires `Uint8Array.toHex` (Chromium ≥ 140);
  a polyfill was also added in `src/extract.ts` so older browser engines work.
- **idb (IndexedDB wrapper)** stores question banks, per-question answers and
  submission history. Database `mcq-practice`, store `banks`.
- **pdf-lib** used only in tests to generate real PDF fixtures.
- **Vitest** for unit + end-to-end tests (node environment; pdf.js runs in Node
  via its legacy build).

## Files

| File | Purpose |
|---|---|
| `src/types.ts` | Domain types (Question, BankRecord, OptionKey…) |
| `src/extract.ts` | pdf.js text extraction, line reconstruction with page tags, scanned-PDF detection, toHex polyfill |
| `src/parser.ts` | Deterministic MCQ parser: numbered questions, `A.`-style options (any count), sequence validation, inline `Ans: X` keys, trailing `ANSWER: X`, end-of-doc `ANSWER KEY` block, multi-line/page-spanning questions |
| `src/batching.ts` | Sequential batches of N (default 10) |
| `src/scoring.ts` | correct / incorrect / unanswered / ungraded computed at submit time |
| `src/pipeline.ts` | Bytes → lines → parsed bank |
| `src/storage.ts` | IndexedDB CRUD for banks |
| `src/bank.ts` | Derived bank stats |
| `src/App.tsx` | Screen router (banks / upload / dashboard / practice / results / edit) |
| `src/screens/*.tsx` | Banks, Upload, Dashboard, Practice, Results, Edit screens |
| `tests/*.test.ts` | 32 tests incl. real-PDF end-to-end extraction |
| `render.yaml`, `README.md` | Render free-tier deployment (static site) |

## Bugs found & fixed during development

1. **`OPT_RE` capture-group bug** — parser regex had two alternative groups;
   `m[1]` was undefined for bare-letter options → crash. Fixed by reading
   `(m[1] ?? m[2])` and text from `m[3]`.
2. **`pageEnd` not propagated** — questions spanning pages reported wrong end
   page. Fixed by passing the line's page into `attachOptionOrText`.
3. **`ungraded` never counted** — scoring incremented only via stray logic;
   fixed with explicit counter.
4. **React Rules-of-Hooks violations** — `useState`/`useMemo` declared after
   conditional returns in `DashboardScreen` and `ResultsScreen` → crash on
   data load. Fixed by moving hooks above early returns; scoring made
   null-safe while bank loads.
5. **pdf.js "a.toHex is not a function"** — pdf.js 6 requires Chromium 140+.
   Fixed by using the legacy build in the browser path + `toHex` polyfill.
6. **Stress-test fixture bug** — test put all 100 answer-key lines on one PDF
   page (y < 0 past ~line 43) and pdf-lib silently dropped them; 45-question
   run also missed pushing the final page. Both were *fixture* bugs; parser
   was correct. Fixed by paginating fixtures.
7. **Misleading results message** — a session with all-unanswered questions
   (keys exist) claimed "no verified answer keys". Reworded per case and added
   an "Answered" stat.

## Verification performed (actual results)

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` → **32 passed (32)**: batching edge cases (1,10,11,100,435),
  scoring rules incl. unanswered/ungraded, parser formats (inline keys,
  key block, multi-line, page-spanning, no-guessing on missing keys), and
  end-to-end extraction of real pdf-lib generated PDFs (250- and 400-question
  stress tests, all keys applied).
- Browser (dev + production build): uploaded `sample-question-paper.pdf`
  (8 questions, 7 keyed), answered 7 correct + 1 wrong → results screen showed
  **88%, 7 correct, 1 incorrect, 0 unanswered** with per-question review;
  answers persisted across reload; resume worked; Retry Incorrect started a
  1-question session; Practise Unanswered / Selected Batches (2 batches →
  15 questions in order) verified; 45-question PDF produced 5 batches
  (10+10+10+10+5); non-PDF rejected with clear error; rename/delete bank OK;
  IndexedDB (`mcq-practice`) confirmed as the persistence layer.
- `npx vite build` → success (~255 KB JS gzip 79 KB + 488 KB pdf.js chunk).

## Known limitations

- **Scanned PDFs (images)** are detected and refused with a clear message; OCR
  (tesseract.js) is installed but not wired into the pipeline.
- Very unusual layouts (two-column question papers, tables, math as images)
  may parse imperfectly; the question editor allows manual fixes.
- Progress is per-browser (IndexedDB); no cross-device sync.

## Commands

```bash
npm install
npm run dev        # dev server
npm test           # 32 tests
npm run build      # typecheck + dist/
npm run preview    # serve dist/
```
