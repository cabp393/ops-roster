import { useEffect, useMemo, useState } from 'react'
import { SHIFTS } from '../data/mock'
import { getRestrictions, getTasks, setRestrictions } from '../lib/storage'
import type { Restrictions, Shift, Task } from '../types'

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

export function RestrictionsPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [tasks, setTasks] = useState<Task[]>([])
  const [restrictions, setRestrictionsState] = useState<Restrictions | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | null>(null)

  useEffect(() => {
    setTasks(getTasks())
  }, [])

  useEffect(() => {
    const existing = getRestrictions(weekStart)
    const base = existing ?? createEmptyRestrictions(weekStart)
    const hydrated = ensureTaskTargets(base, tasks)
    setRestrictionsState(hydrated)
    setSavedLabel(existing ? 'Loaded' : null)
  }, [weekStart, tasks])

  const activeTasks = useMemo(() => tasks.filter((task) => task.isActive), [tasks])

  function updateTaskTarget(
    shift: Shift,
    taskId: string,
    field: 'min' | 'target' | 'max',
    value: number,
  ) {
    if (!restrictions) return
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
              [field]: value,
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
    const coreTasks = ['task-descarga', 'task-carga']
    const next = { ...restrictions, profileName: 'High Season' }
    SHIFTS.forEach((shift) => {
      coreTasks.forEach((taskId) => {
        if (next.demand.tasks[shift][taskId]) {
          next.demand.tasks[shift][taskId] = {
            ...next.demand.tasks[shift][taskId],
            min: 10,
            target: 10,
            max: 12,
          }
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
          <strong>{shift} shift task targets</strong>
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
                {activeTasks.map((task) => {
                  const target = restrictions.demand.tasks[shift][task.id] ?? {
                    min: 0,
                    target: 0,
                    max: 0,
                    priority: task.priority,
                  }
                  return (
                    <tr key={`${shift}-${task.id}`}>
                      <td>{task.name}</td>
                      <td>
                        <input
                          type="number"
                          value={target.min}
                          onChange={(event) =>
                            updateTaskTarget(shift, task.id, 'min', Number(event.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={target.target}
                          onChange={(event) =>
                            updateTaskTarget(shift, task.id, 'target', Number(event.target.value))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={target.max}
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
        </div>
      ))}
    </section>
  )
}
