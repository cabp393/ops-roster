import { useState } from 'react'
import { Tabs } from './components/Tabs'
import { PlanningPage } from './pages/PlanningPage'
import { WorkersPage } from './pages/WorkersPage'
import { SetupPage } from './pages/SetupPage'
import { EquipmentsPage } from './pages/EquipmentsPage'
import { getIsoWeekNumber, getIsoWeekYear } from './lib/week'
import { useOrganization } from './lib/organizationContext'

const fallbackWeekNumber = 1
const fallbackWeekYear = 2025

export function App() {
  const [activeTab, setActiveTab] = useState<'planning' | 'workers' | 'equipments' | 'setup'>('planning')
  const { organizations, activeOrganizationId, setActiveOrganizationId, isLoading, error } = useOrganization()
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
        <div>
          <h1>Ops Roster</h1>
          <p className="subtitle">Turnos y dotación por organización</p>
        </div>
        <div className="organization-selector">
          <label className="field">
            Organización
            <select
              value={activeOrganizationId ?? ''}
              onChange={(event) => {
                const value = event.target.value
                setActiveOrganizationId(value || null)
              }}
              disabled={isLoading || organizations.length === 0}
            >
              <option value="" disabled>
                {isLoading ? 'Cargando...' : 'Selecciona'}
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          {error ? <span className="helper-text">{error}</span> : null}
        </div>
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
