# MCQ Practice — PDF Question Bank Trainer

Upload a PDF of multiple-choice questions, get them extracted automatically,
split into batches of 10, practise any batch (or the whole bank), and score
yourself at the end.

- **Framework:** Vite + React 19 + TypeScript
- **PDF parsing:** pdf.js (`pdfjs-dist`, legacy build) — fully client-side
- **Storage:** IndexedDB (`idb`) — progress, answers and history persist across refreshes and browser restarts
- **Tests:** Vitest (32 tests: parser, batching, scoring, and end-to-end extraction of real generated PDFs)

## Run locally

```bash
npm install
npm run dev        # -> http://localhost:5173
```

## Build for production

```bash
npm run build      # type-checks then bundles to dist/
npm run preview    # serves dist/ locally
```

## Test

```bash
npm test           # runs all 32 vitest tests
```

## Deploy to Vercel (recommended, free)

This app is a **pure client-side static SPA** — no server, no environment
variables, no database — which is precisely what Vercel's Hobby (free) tier
hosts. Vercel auto-detects Vite from [vercel.json](vercel.json).

### Option A: connect a Git repo (recommended)

1. Push this project to GitHub/GitLab/Bitbucket.
2. In [vercel.com](https://vercel.com): **Add New → Project** → import the repo.
3. Leave all build settings as auto-detected (Framework: Vite, Build: `npm run build`, Output: `dist`) and click **Deploy**.
4. You get a `https://<project>.vercel.app` URL; every push to `main` redeploys automatically.

### Option B: from your machine with the CLI (no repo needed)

```bash
npm i -g vercel
vercel           # first time: answer the setup prompts (accept the detected Vite settings)
vercel --prod    # ship to production
```

### Configuration already included

- [vercel.json](vercel.json): SPA rewrite (`/anything → /index.html`) and immutable long-term caching for hashed `/assets/*` files.
- The Groq API key is entered by each user in the browser at upload time and stored in their own `localStorage` — it is never bundled into the build and requires no server env vars.

### Notes

- All PDF processing happens in the user's browser; no data ever leaves the device.
- IndexedDB storage is per-browser/per-origin — each user's progress is local to their own browser and cannot be transferred between devices or browsers.
- No backend, no secrets in the repo, no database required.

## Deploy to Render (free alternative)

This app is a **static SPA** — there is no server code, so Render's free
*Static Site* tier (free, 100 GB bandwith/mo) is all you need.

### Option A: render.yaml blueprint (if you prefer Render)

1. Push this project to a GitHub/GitLab repo.
2. In Render: **New + → Blueprint**, pick the repo. Render reads `render.yaml`
   and creates a static site from `dist/`.
3. Done — you get a `https://mcq-practice-xxxx.onrender.com` URL.

### Option B: manual (no blueprint)

1. Push the repo to GitHub.
2. In Render: **New + → Static Site**, connect the repo.
3. Settings:
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `dist`
   - **Node version:** read from the included `.nvmrc` (22) — or set env var `NODE_VERSION=22`
   - **SPA Rewrite:** `/*  →  /index.html`
4. Deploy.

### Notes

- All PDF processing happens in the user's browser; no data ever leaves the device.
- IndexedDB storage is per-browser/per-origin — each user's progress is local to their own browser and cannot be transferred between devices or browsers.
- No environment variables, no backend secrets, no database required.
