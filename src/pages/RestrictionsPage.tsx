import { useEffect, useMemo, useState } from 'react'
import { SHIFTS } from '../data/mock'
import { getRestrictions, getRoles, setRestrictions } from '../lib/storage'
import type { Restrictions, Role, Shift } from '../types'

const fallbackWeekStart = '2025-12-29'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultWeekStart() {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const offset = (dayOfWeek + 6) % 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - offset)
    return toDateInputValue(monday)
  } catch {
    return fallbackWeekStart
  }
}

function buildRoleTargets(roles: Role[]) {
  return roles.reduce<Record<string, { min: number; target: number; max: number }>>((acc, role) => {
    acc[role.code] = { min: 0, target: 0, max: 0 }
    return acc
  }, {})
}

function createEmptyRestrictions(weekStart: string, roles: Role[]): Restrictions {
  const activeRoles = roles.filter((role) => role.isActive)
  return {
    weekStart,
    demand: {
      shifts: {
        M: { roleTargets: buildRoleTargets(activeRoles) },
        T: { roleTargets: buildRoleTargets(activeRoles) },
        N: { roleTargets: buildRoleTargets(activeRoles) },
      },
      tasks: {
        M: {},
        T: {},
        N: {},
      },
    },
    policies: {
      balanceTotals: true,
      balanceByRole: true,
      respectFixed: true,
      respectAllowedShifts: true,
    },
  }
}

export function RestrictionsPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [roles, setRoles] = useState<Role[]>([])
  const [restrictions, setRestrictionsState] = useState<Restrictions | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | null>(null)

  useEffect(() => {
    setRoles(getRoles())
  }, [])

  useEffect(() => {
    if (roles.length === 0) return
    const existing = getRestrictions(weekStart)
    if (existing) {
      setRestrictionsState(existing)
      setSavedLabel('Loaded')
    } else {
      setRestrictionsState(createEmptyRestrictions(weekStart, roles))
      setSavedLabel(null)
    }
  }, [weekStart, roles])

  const activeRoles = useMemo(() => roles.filter((role) => role.isActive), [roles])

  function updateRoleTarget(shift: Shift, roleCode: string, field: 'min' | 'target' | 'max', value: number) {
    if (!restrictions) return
    setRestrictionsState({
      ...restrictions,
      demand: {
        ...restrictions.demand,
        shifts: {
          ...restrictions.demand.shifts,
          [shift]: {
            ...restrictions.demand.shifts[shift],
            roleTargets: {
              ...restrictions.demand.shifts[shift].roleTargets,
              [roleCode]: {
                ...restrictions.demand.shifts[shift].roleTargets[roleCode],
                [field]: value,
              },
            },
          },
        },
      },
    })
  }

  function handleSave() {
    if (!restrictions) return
    setRestrictions(weekStart, restrictions)
    setSavedLabel(`Saved ${new Date().toLocaleTimeString()}`)
  }

  function handleHighSeasonPreset() {
    if (!restrictions) return
    const presetTargets: Record<Shift, Record<string, number>> = {
      M: { OG: 14, AL: 19, JT: 2 },
      T: { OG: 13, AL: 20, JT: 1 },
      N: { OG: 13, AL: 13, JT: 1 },
    }

    const next = { ...restrictions, profileName: 'High Season' }
    SHIFTS.forEach((shift) => {
      const targets = presetTargets[shift]
      Object.keys(targets).forEach((roleCode) => {
        const targetValue = targets[roleCode]
        next.demand.shifts[shift].roleTargets[roleCode] = {
          min: targetValue,
          target: targetValue,
          max: targetValue,
        }
      })
    })

    setRestrictionsState(next)
    setSavedLabel('High Season preset applied')
  }

  if (!restrictions) {
    return (
      <section>
        <h2>Restrictions</h2>
        <p className="summary">Loading restrictions...</p>
      </section>
    )
  }

  return (
    <section>
      <h2>Restrictions</h2>
      <div className="planning-controls">
        <label className="field">
          Week start
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button type="button" onClick={handleSave}>
            Save
          </button>
          <button type="button" onClick={handleHighSeasonPreset}>
            High Season preset
          </button>
        </div>
      </div>
      {savedLabel ? <p className="summary">{savedLabel}</p> : null}
      {SHIFTS.map((shift) => (
        <div key={shift} className="summary" style={{ marginTop: '1rem' }}>
          <strong>{shift} shift role targets</strong>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Min</th>
                  <th>Target</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {activeRoles.map((role) => {
                  const target = restrictions.demand.shifts[shift].roleTargets[role.code] ?? {
                    min: 0,
                    target: 0,
                    max: 0,
                  }
                  return (
                    <tr key={`${shift}-${role.code}`}>
                      <td>{role.name}</td>
                      <td>
                        <input
                          type="number"
                          value={target.min}
                          onChange={(event) =>
                            updateRoleTarget(shift, role.code, 'min', Number(event.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={target.target}
                          onChange={(event) =>
                            updateRoleTarget(shift, role.code, 'target', Number(event.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={target.max}
                          onChange={(event) =>
                            updateRoleTarget(shift, role.code, 'max', Number(event.target.value))
                          }
                        />
                      </td>
                    </tr>
                  )}
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  )
}
