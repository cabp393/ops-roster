import { useState } from 'react'
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

  return (
    <div className="app">
      <header className="header">
        <h1>Ops Roster</h1>
        <p className="subtitle">Minimal roster overview</p>
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
