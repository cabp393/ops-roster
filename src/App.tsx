import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Tabs } from './components/Tabs'
import { AuthPage } from './pages/AuthPage'
import { PlanningPage } from './pages/PlanningPage'
import { WorkersPage } from './pages/WorkersPage'
import { SetupPage } from './pages/SetupPage'
import { EquipmentsPage } from './pages/EquipmentsPage'
import { OrganizationOnboardingPage } from './pages/OrganizationOnboardingPage'
import { getIsoWeekNumber, getIsoWeekYear } from './lib/week'
import { useOrganization } from './lib/organizationContext'
import { supabase } from './lib/supabaseClient'

const fallbackWeekNumber = 1
const fallbackWeekYear = 2025

export function App() {
  const [activeTab, setActiveTab] = useState<'planning' | 'workers' | 'equipments' | 'setup'>('planning')
  const {
    organizations,
    activeOrganizationId,
    setActiveOrganizationId,
    refreshOrganizations,
    refreshMemberRole,
    isLoading,
    error,
  } = useOrganization()
  const [session, setSession] = useState<Session | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
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

  useEffect(() => {
    let isMounted = true
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!isMounted) return
        if (sessionError) {
          console.warn(sessionError.message)
        }
        setSession(data.session ?? null)
        setIsAuthLoading(false)
        if (data.session) {
          void refreshOrganizations()
        } else {
          setActiveOrganizationId(null)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn(err instanceof Error ? err.message : 'No se pudo validar la sesión.')
        setSession(null)
        setIsAuthLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        void refreshOrganizations()
      } else {
        setActiveOrganizationId(null)
      }
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [refreshOrganizations, setActiveOrganizationId])

  if (isAuthLoading) {
    return (
      <div className="app">
        <p className="helper-text">Validando sesión...</p>
      </div>
    )
  }

  if (!session) {
    return <AuthPage />
  }

  if (!isLoading && organizations.length === 0) {
    return (
      <OrganizationOnboardingPage
        onOrganizationCreated={(organization) => {
          setActiveOrganizationId(organization.id)
          void refreshOrganizations()
          void refreshMemberRole()
        }}
        onSignOut={() => {
          void supabase.auth.signOut()
        }}
      />
    )
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
                {isLoading ? 'Cargando...' : organizations.length === 0 ? 'Sin organizaciones' : 'Selecciona'}
              </option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
          {error ? <span className="helper-text">{error}</span> : null}
          <button
            className="auth-secondary"
            type="button"
            onClick={() => {
              void supabase.auth.signOut()
            }}
          >
            Cerrar sesión
          </button>
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
