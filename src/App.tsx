import { useCallback, useEffect, useState } from 'react'
import type { BankRecord } from './types'
import { listBanks } from './storage'
import { BanksScreen } from './screens/Banks'
import { UploadScreen } from './screens/Upload'
import { DashboardScreen } from './screens/Dashboard'
import { PracticeScreen } from './screens/Practice'
import { ResultsScreen } from './screens/Results'
import { EditScreen } from './screens/Edit'
import { DocsScreen } from './screens/Docs'
import { LandingScreen } from './screens/Landing'

export type Screen =
  | { name: 'landing' }
  | { name: 'banks' }
  | { name: 'upload' }
  | { name: 'dashboard'; bankId: string }
  | { name: 'practice'; bankId: string; order: number[]; label: string; batchSize: number }
  | { name: 'results'; bankId: string; label: string; order: number[]; batchSize: number }
  | { name: 'edit'; bankId: string }
  | { name: 'docs' }

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'landing' })
  const [banks, setBanks] = useState<BankRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const b = await listBanks()
      setBanks(b)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const isLanding = screen.name === 'landing'

  const onLandingPick = (file: File) => {
    setPendingFile(file)
    setScreen({ name: 'upload' })
  }

  const uploadDone = (bankId: string, review = false) => {
    setPendingFile(null)
    refresh()
    setScreen(review ? { name: 'edit', bankId } : { name: 'dashboard', bankId })
  }

  let body: React.ReactNode = null
  if (loading && !isLanding && screen.name !== 'docs') body = <div className="card muted">Loading…</div>
  else if (isLanding)
    body = <LandingScreen onGo={setScreen} onPickFile={onLandingPick} />
  else if (screen.name === 'banks')
    body = <BanksScreen banks={banks} onGo={setScreen} onRefresh={refresh} />
  else if (screen.name === 'upload')
    body = (
      <UploadScreen
        initialFile={pendingFile}
        onDone={uploadDone}
        onCancel={() => setScreen({ name: 'banks' })}
      />
    )
  else if (screen.name === 'dashboard')
    body = <DashboardScreen bankId={screen.bankId} onGo={setScreen} onRefresh={refresh} />
  else if (screen.name === 'practice')
    body = (
      <PracticeScreen
        key={screen.order.join(',') + screen.label}
        bankId={screen.bankId}
        order={screen.order}
        label={screen.label}
        batchSize={screen.batchSize}
        onGo={setScreen}
        onRefresh={refresh}
      />
    )
  else if (screen.name === 'results')
    body = (
      <ResultsScreen
        key={screen.order.join(',') + screen.label}
        bankId={screen.bankId}
        label={screen.label}
        order={screen.order}
        batchSize={screen.batchSize}
        onGo={setScreen}
        onRefresh={refresh}
      />
    )
  else if (screen.name === 'edit')
    body = <EditScreen bankId={screen.bankId} onGo={setScreen} onRefresh={refresh} />
  else if (screen.name === 'docs')
    body = <DocsScreen onGo={setScreen} />

  return (
    <>
      {isLanding ? (
        body
      ) : (
        <>
          <SiteHeader screen={screen} onGo={setScreen} />
          <div className={`app ${screen.name === 'practice' ? 'narrow' : ''}`}>
            {body}
          </div>
        </>
      )}
    </>
  )
}

/** Shared fixed top bar — mirrors the designer's header exactly (logo, nav,
 *  sync chip, Add PDF, avatar). Router links go to internal screens. */
function SiteHeader(props: { screen: Screen; onGo: (s: Screen) => void }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <div className="site-header-left">
          <button className="brand" onClick={() => props.onGo({ name: 'landing' })}>
            <img className="brand-logo" src="/logo.png" alt="MCQ Practice Logo" />
            <span>MCQ Practice</span>
          </button>
          <span className="brand-pill">Local &amp; Private</span>
          <nav className="site-nav">
            <a
              href="#"
              className={props.screen.name === 'banks' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); props.onGo({ name: 'banks' }) }}
            >
              Question Banks
            </a>
            <a
              href="#"
              className={props.screen.name === 'upload' ? 'active' : ''}
              onClick={(e) => { e.preventDefault(); props.onGo({ name: 'upload' }) }}
            >
              Upload
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); props.onGo({ name: 'docs' }) }} className={props.screen.name === 'docs' ? 'active' : ''}>
              Documentation &amp; FAQ
            </a>
          </nav>
        </div>
        <div className="site-header-right">
          <div className="sync-chip">
            <span className="material-symbols-outlined">sync</span>
            <span>IndexedDB Local Storage (Synced)</span>
          </div>
          <button className="btn" onClick={() => props.onGo({ name: 'upload' })}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            <span>Add PDF</span>
          </button>
          <img className="header-avatar" src="/avatar.png" alt="Profile" />
        </div>
      </div>
    </header>
  )
}
