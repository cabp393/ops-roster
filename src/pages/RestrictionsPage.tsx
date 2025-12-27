import { useEffect, useMemo, useState } from 'react'
import { SHIFTS } from '../data/mock'
import { getRestrictions, getRoles, getTasks, setRestrictions } from '../lib/storage'
import type { Restrictions, Role, Shift, Task } from '../types'

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

function createEmptyRestrictions(weekStart: string): Restrictions {
  return {
    weekStart,
    demand: {
      shifts: {
        M: { roleTargets: {} },
        T: { roleTargets: {} },
        N: { roleTargets: {} },
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

function ensureTaskTargets(restrictions: Restrictions, tasks: Task[]) {
  const activeTasks = tasks.filter((task) => task.isActive)
  const next = { ...restrictions, demand: { ...restrictions.demand, tasks: { ...restrictions.demand.tasks } } }

  SHIFTS.forEach((shift) => {
    const shiftTargets = { ...next.demand.tasks[shift] }
    activeTasks.forEach((task) => {
      if (!shiftTargets[task.id]) {
        shiftTargets[task.id] = { min: 0, target: 0, max: 0, priority: task.priority }
      }
    })
    next.demand.tasks[shift] = shiftTargets
  })

  return next
}

const compactInputStyle = {
  width: '56px',
}

export function RestrictionsPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [restrictions, setRestrictionsState] = useState<Restrictions | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | null>(null)

  useEffect(() => {
    setRoles(getRoles())
    setTasks(getTasks())
  }, [])

  useEffect(() => {
    const existing = getRestrictions(weekStart)
    const base = existing ?? createEmptyRestrictions(weekStart)
    const hydrated = ensureTaskTargets(base, tasks)
    setRestrictionsState(hydrated)
    setSavedLabel(existing ? 'Loaded' : null)
  }, [weekStart, tasks])

  const activeRoles = useMemo(() => roles.filter((role) => role.isActive), [roles])
  const activeTasks = useMemo(() => tasks.filter((task) => task.isActive), [tasks])

  const tasksByRole = useMemo(() => {
    return activeRoles.map((role) => ({
      role,
      tasks: activeTasks.filter((task) => task.allowedRoleCodes.includes(role.code)),
    }))
  }, [activeRoles, activeTasks])

  function updateTaskTarget(
    shift: Shift,
    taskId: string,
    field: 'min' | 'target' | 'max',
    value: number,
  ) {
    if (!restrictions) return
    const clampedValue = Math.max(0, Math.min(99, value))
    setRestrictionsState({
      ...restrictions,
      demand: {
        ...restrictions.demand,
        tasks: {
          ...restrictions.demand.tasks,
          [shift]: {
            ...restrictions.demand.tasks[shift],
            [taskId]: {
              ...restrictions.demand.tasks[shift][taskId],
              [field]: clampedValue,
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

  if (!restrictions) {
    return (
      <section>
        <p className="summary">Loading restrictions...</p>
      </section>
    )
  }

  return (
    <section>
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
        </div>
      </div>
      {savedLabel ? <p className="summary">{savedLabel}</p> : null}
      {SHIFTS.map((shift) => (
        <div key={shift} className="summary" style={{ marginTop: '1rem' }}>
          <strong>{shift} shift task targets</strong>
          {tasksByRole.map(({ role, tasks: roleTasks }) => (
            <div key={`${shift}-${role.code}`} style={{ marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{role.name}</div>
              {roleTasks.length === 0 ? (
                <p className="summary">No tasks for this role.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Min</th>
                        <th>Target</th>
                        <th>Max</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleTasks.map((task) => {
                        const target = restrictions.demand.tasks[shift][task.id] ?? {
                          min: 0,
                          target: 0,
                          max: 0,
                          priority: task.priority,
                        }
                        return (
                          <tr key={`${shift}-${role.code}-${task.id}`}>
                            <td>{task.name}</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                inputMode="numeric"
                                value={target.min}
                                style={compactInputStyle}
                                onChange={(event) =>
                                  updateTaskTarget(shift, task.id, 'min', Number(event.target.value))
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                inputMode="numeric"
                                value={target.target}
                                style={compactInputStyle}
                                onChange={(event) =>
                                  updateTaskTarget(shift, task.id, 'target', Number(event.target.value))
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                inputMode="numeric"
                                value={target.max}
                                style={compactInputStyle}
                                onChange={(event) =>
                                  updateTaskTarget(shift, task.id, 'max', Number(event.target.value))
                                }
                              />
                            </td>
                            <td>{target.priority}</td>
                          </tr>
                        )}
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
