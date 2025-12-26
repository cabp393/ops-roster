import { useState } from 'react'
import { Tabs } from './components/Tabs'
import { PlanningPage } from './pages/PlanningPage'
import { SummaryPage } from './pages/SummaryPage'
import { WorkersPage } from './pages/WorkersPage'

export function App() {
  const [activeTab, setActiveTab] = useState<'workers' | 'planning' | 'summary'>('workers')

  return (
    <div className="app">
      <header className="header">
        <h1>Ops Roster</h1>
        <p className="subtitle">Minimal roster overview</p>
      </header>
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <main className="content">
        {activeTab === 'workers' ? (
          <WorkersPage />
        ) : activeTab === 'planning' ? (
          <PlanningPage />
        ) : (
          <SummaryPage />
        )}
      </main>
    </div>
  )
}
