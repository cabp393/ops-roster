import { useState } from 'react'
import { Tabs } from './components/Tabs'
import { PlanningPage } from './pages/PlanningPage'
import { WorkersPage } from './pages/WorkersPage'
import { SetupPage } from './pages/SetupPage'
import { EquipmentsPage } from './pages/EquipmentsPage'
import { getIsoWeekNumber, getIsoWeekYear, getWeekRangeLabel } from './lib/week'

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

  const tabMeta = {
    planning: {
      title: 'Plan semanal',
      description: 'Distribuye turnos, roles y equipos en una vista compacta.',
    },
    workers: {
      title: 'Equipo operativo',
      description: 'Gestiona personal, contratos y restricciones de turno.',
    },
    equipments: {
      title: 'Flota y equipos',
      description: 'Controla disponibilidad, variantes y estado operativo.',
    },
    setup: {
      title: 'Parámetros base',
      description: 'Ajusta roles, tareas y catálogos de apoyo.',
    },
  } as const

  const activeMeta = tabMeta[activeTab]
  const weekRangeLabel = getWeekRangeLabel(weekNumber, weekYear)

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span className="brand-title">Ops Roster</span>
          <span className="brand-subtitle">Centro operativo</span>
        </div>
        <Tabs activeTab={activeTab} onChange={setActiveTab} />
        <div className="sidebar-footer">
          <span className="status-dot" aria-hidden="true" />
          <span className="sidebar-foot-text">Sistema listo</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div>
            <span className="header-kicker">Panel operativo</span>
            <h1>{activeMeta.title}</h1>
            <p>{activeMeta.description}</p>
          </div>
          {activeTab === 'planning' ? (
            <div className="header-meta">
              <div className="meta-card">
                <span className="meta-label">Semana activa</span>
                <span className="meta-value">
                  {weekNumber} · {weekYear}
                </span>
                <span className="meta-muted">{weekRangeLabel}</span>
              </div>
            </div>
          ) : null}
        </header>
        <main className="page-content">
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
    </div>
  )
}
