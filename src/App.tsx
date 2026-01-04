import { useState } from 'react'
import { Tabs } from './components/Tabs'
import { PlanningPage } from './pages/PlanningPage'
import { WorkersPage } from './pages/WorkersPage'
import { SetupPage } from './pages/SetupPage'
import { EquipmentsPage } from './pages/EquipmentsPage'
import { getIsoWeekNumber, getIsoWeekYear } from './lib/week'

const fallbackWeekNumber = 1
const fallbackWeekYear = 2025

export function App() {
  const [activeTab, setActiveTab] = useState<'planning' | 'workers' | 'equipments' | 'setup'>('planning')
  const today = new Date()
  const [weekNumber, setWeekNumber] = useState(() => {
    try {
      return getIsoWeekNumber(today)
    } catch {
      return fallbackWeekNumber
    }
  })
  const [weekYear, setWeekYear] = useState(() => {
    try {
      return getIsoWeekYear(today)
    } catch {
      return fallbackWeekYear
    }
  })

  function handleWeekChange(nextWeekNumber: number, nextWeekYear: number) {
    setWeekNumber(nextWeekNumber)
    setWeekYear(nextWeekYear)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Ops Roster</h1>
        <p className="subtitle">Planificación semanal en un tablero compacto.</p>
      </header>
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <main className="content">
        {activeTab === 'planning' ? (
          <PlanningPage
            weekNumber={weekNumber}
            weekYear={weekYear}
            onWeekChange={handleWeekChange}
          />
        ) : activeTab === 'workers' ? (
          <WorkersPage />
        ) : activeTab === 'equipments' ? (
          <EquipmentsPage />
        ) : (
          <SetupPage />
        )}
      </main>
    </div>
  )
}
