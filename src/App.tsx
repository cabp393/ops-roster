import { useEffect, useState } from 'react'
import { Tabs } from './components/Tabs'
import { PlanningPage } from './pages/PlanningPage'
import { SummaryPage } from './pages/SummaryPage'
import { RestrictionsPage } from './pages/RestrictionsPage'
import { WorkersPage } from './pages/WorkersPage'
import { SetupPage } from './pages/SetupPage'

export function App() {
  const [activeTab, setActiveTab] = useState<
    'planning' | 'summary' | 'restrictions' | 'workers' | 'setup'
  >('planning')
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = localStorage.getItem('opsRoster:theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('opsRoster:theme', theme)
  }, [theme])

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Planificación operativa</p>
          <h1>Ops Roster</h1>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </header>
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <main className="content">
        {activeTab === 'planning' ? (
          <PlanningPage />
        ) : activeTab === 'summary' ? (
          <SummaryPage />
        ) : activeTab === 'restrictions' ? (
          <RestrictionsPage />
        ) : activeTab === 'workers' ? (
          <WorkersPage />
        ) : (
          <SetupPage />
        )}
      </main>
    </div>
  )
}
