import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_TASK_PRIORITY, SHIFT_LABEL, SHIFTS } from '../data/mock'
import {
  getRestrictionPreset,
  getRestrictionPresetNames,
  getRoles,
  getTasks,
  setRestrictionPreset,
} from '../lib/storage'
import type { Restrictions, Role, Shift, Task, TaskPriority } from '../types'

const fallbackWeekStart = '2025-12-29'
const PRIORITIES: Array<{ value: TaskPriority; label: string }> = [
  { value: '', label: 'Vacía' },
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
]
const SHIFT_ORDER: Shift[] = ['N', 'M', 'T']

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

function createEmptyRestrictions(weekStart: string, profileName: string): Restrictions {
  return {
    weekStart,
    profileName,
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
    Object.entries(shiftTargets).forEach(([taskId, target]) => {
      shiftTargets[taskId] = {
        max: target.max ?? 0,
        priority: target.priority ?? DEFAULT_TASK_PRIORITY,
      }
    })
    activeTasks.forEach((task) => {
      if (!shiftTargets[task.id]) {
        shiftTargets[task.id] = { max: 0, priority: DEFAULT_TASK_PRIORITY }
      }
    })
    next.demand.tasks[shift] = shiftTargets
  })

  return next
}

const compactInputStyle = {
  width: '56px',
}

const shiftCardStyle = {
  marginTop: '1rem',
  padding: '1rem',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  background: '#f8fafc',
}

export function RestrictionsPage() {
  const [presetName, setPresetName] = useState('')
  const [presetOptions, setPresetOptions] = useState<string[]>([])
  const [duplicateName, setDuplicateName] = useState('')
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [restrictions, setRestrictionsState] = useState<Restrictions | null>(null)
  const [savedLabel, setSavedLabel] = useState<string | null>(null)

  useEffect(() => {
    setRoles(getRoles())
    setTasks(getTasks())
  }, [])

  useEffect(() => {
    if (tasks.length === 0) return
    const existingPresets = getRestrictionPresetNames()
    let nextPresets = existingPresets
    if (nextPresets.length === 0) {
      const fallbackName = 'Base'
      const fallback = ensureTaskTargets(createEmptyRestrictions(getDefaultWeekStart(), fallbackName), tasks)
      setRestrictionPreset(fallbackName, fallback)
      nextPresets = [fallbackName]
    }
    setPresetOptions(nextPresets)
    if (!presetName || !nextPresets.includes(presetName)) {
      setPresetName(nextPresets[0])
    }
  }, [tasks, presetName])

  useEffect(() => {
    if (!presetName) return
    const existing = getRestrictionPreset(presetName)
    const base = existing ?? createEmptyRestrictions(getDefaultWeekStart(), presetName)
    const hydrated = ensureTaskTargets(base, tasks)
    setRestrictionsState(hydrated)
    setSavedLabel(existing ? 'Loaded' : null)
  }, [presetName, tasks])

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
    field: 'max',
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

  function updateTaskPriority(shift: Shift, taskId: string, priority: TaskPriority) {
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
              priority,
            },
          },
        },
      },
    })
  }

  function handleSave() {
    if (!restrictions) return
    setRestrictionPreset(presetName, { ...restrictions, profileName: presetName })
    setSavedLabel(`Saved ${new Date().toLocaleTimeString()}`)
  }

  function handleDuplicate() {
    if (!restrictions) return
    const trimmed = duplicateName.trim()
    if (!trimmed) {
      setSavedLabel('Enter a preset name to duplicate.')
      return
    }
    if (presetOptions.includes(trimmed)) {
      setSavedLabel('Preset already exists.')
      return
    }
    const next = {
      ...restrictions,
      profileName: trimmed,
    }
    setRestrictionPreset(trimmed, next)
    setPresetOptions((current) => [...current, trimmed])
    setPresetName(trimmed)
    setDuplicateName('')
    setSavedLabel(`Duplicated as ${trimmed}.`)
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
          Preset
          <select value={presetName} onChange={(event) => setPresetName(event.target.value)}>
            {presetOptions.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Duplicate as
          <input
            type="text"
            value={duplicateName}
            placeholder="New preset"
            onChange={(event) => setDuplicateName(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button type="button" onClick={handleDuplicate}>
            Duplicate preset
          </button>
          <button type="button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
      {savedLabel ? <p className="summary">{savedLabel}</p> : null}
      {SHIFT_ORDER.map((shift) => (
        <div key={shift} className="summary shift-card" style={shiftCardStyle}>
          <strong>{SHIFT_LABEL[shift]} · objetivos de tareas</strong>
          {tasksByRole.map(({ role, tasks: roleTasks }) => (
            <div key={`${shift}-${role.code}`} style={{ marginTop: '0.75rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{role.name}</div>
              {roleTasks.length === 0 ? (
                <p className="summary">No tasks for this role.</p>
              ) : (
                <div className="table-wrap">
                  <table className="compact-table">
                    <colgroup>
                      <col />
                      <col style={{ width: '72px' }} />
                      <col style={{ width: '110px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="task-col">Task</th>
                        <th className="num-col">Max</th>
                        <th className="prio-col">Pri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleTasks.map((task) => {
                        const target = restrictions.demand.tasks[shift][task.id] ?? {
                          max: 0,
                          priority: DEFAULT_TASK_PRIORITY,
                        }
                        return (
                          <tr key={`${shift}-${role.code}-${task.id}`}>
                            <td className="task-col">{task.name}</td>
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
                            <td className="prio-col">
                              <select
                                className="priority-select"
                                value={target.priority}
                                onChange={(event) =>
                                  updateTaskPriority(shift, task.id, event.target.value as TaskPriority)
                                }
                              >
                                {PRIORITIES.map((priority) => (
                                  <option key={priority.value} value={priority.value}>
                                    {priority.label}
                                  </option>
                                ))}
                              </select>
                            </td>
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
