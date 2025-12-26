import { useEffect, useMemo, useState } from 'react'
import { SHIFT_LABEL, SHIFTS, TASKS_BY_GROUP, prevWeekShifts, workers } from '../data/mock'
import { autoAssignTasks, computeWeekStats, generateWeekPlan, validateWeekPlan } from '../lib/planning'
import { clearPlanning, loadPlanning, savePlanning } from '../lib/storage'
import type { Assignment, PlanningRecord, Shift } from '../lib/types'

const fallbackWeekStart = '2025-12-29'

const GROUPS = Object.keys(TASKS_BY_GROUP) as Array<keyof typeof TASKS_BY_GROUP>

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

function makeRecord(weekStart: string, assignments: Assignment[]): PlanningRecord {
  return { weekStart, assignments }
}

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [savedLabel, setSavedLabel] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    const saved = loadPlanning(weekStart)
    setAssignments(saved?.assignments ?? [])
    const savedWarnings = saved?.assignments.length
      ? validateWeekPlan(saved.assignments, workers, prevWeekShifts)
      : []
    setWarnings(savedWarnings)
    setSavedLabel(saved ? 'Saved' : null)
  }, [weekStart])

  const assignmentsByWorker = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.workerId, assignment]))
  }, [assignments])

  const stats = useMemo(() => computeWeekStats(assignments, workers), [assignments])

  function persist(nextAssignments: Assignment[], nextWarnings?: string[]) {
    setAssignments(nextAssignments)
    savePlanning(weekStart, makeRecord(weekStart, nextAssignments))
    setSavedLabel(`Saved ${new Date().toLocaleTimeString()}`)
    setWarnings(nextWarnings ?? validateWeekPlan(nextAssignments, workers, prevWeekShifts))
  }

  function handleGenerate() {
    const plan = generateWeekPlan({
      weekStart,
      workers,
      prevWeekShifts,
      existingAssignments: assignments,
    })
    persist(plan.assignments, plan.warnings)
  }

  function handleClear() {
    clearPlanning(weekStart)
    setAssignments([])
    setSavedLabel(null)
  }

  function handleShiftChange(workerId: number, shift: string) {
    if (!shift) return
    const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
    const index = nextAssignments.findIndex((assignment) => assignment.workerId === workerId)
    if (index >= 0) {
      const currentMeta = nextAssignments[index].meta ?? { shiftSource: 'generated', taskSource: 'generated' }
      nextAssignments[index] = {
        ...nextAssignments[index],
        shift: shift as Shift,
        meta: { ...currentMeta, shiftSource: 'manual' },
      }
    } else {
      nextAssignments.push({
        workerId,
        weekStart,
        shift: shift as Shift,
        meta: { shiftSource: 'manual', taskSource: 'generated' },
      })
    }
    persist(nextAssignments)
  }

  function handleTaskChange(workerId: number, task: string) {
    const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
    const index = nextAssignments.findIndex((assignment) => assignment.workerId === workerId)
    if (index === -1) return
    const currentMeta = nextAssignments[index].meta ?? { shiftSource: 'generated', taskSource: 'generated' }
    nextAssignments[index] = {
      ...nextAssignments[index],
      task: task || undefined,
      meta: { ...currentMeta, taskSource: 'manual' },
    }
    persist(nextAssignments)
  }

  function handleAutoTasks() {
    const nextAssignments = autoAssignTasks(assignments, workers, TASKS_BY_GROUP)
    persist(nextAssignments)
  }

  return (
    <section>
      <h2>Planning</h2>
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
          <button type="button" onClick={handleGenerate}>
            Generate shifts
          </button>
          <button type="button" onClick={handleAutoTasks}>
            Auto tasks
          </button>
          <button type="button" onClick={handleClear}>
            Clear week
          </button>
        </div>
      </div>
      <p className="summary">
        Summary: {SHIFTS.map((shift) => `${shift}: ${stats.totals[shift]}`).join(', ')}
      </p>
      <p className="summary">
        Group totals:{' '}
        {GROUPS.map(
          (group) =>
            `${group} (${SHIFTS.map((shift) => `${shift}: ${stats.perGroup[group][shift]}`).join(', ')})`,
        ).join(' | ')}
      </p>
      {savedLabel ? <p className="summary">{savedLabel}</p> : null}
      {warnings.length ? (
        <div className="summary">
          <strong>Warnings</strong>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Contract</th>
              <th>Shift Mode</th>
              <th>Assigned Shift</th>
              <th>Task</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => {
              const assignment = assignmentsByWorker.get(worker.id)
              const allowedShifts = worker.constraints?.allowedShifts ?? SHIFTS
              const isFixed = worker.shiftMode === 'Fijo'
              const fixedShift = worker.fixedShift
              const currentShift = isFixed ? fixedShift : assignment?.shift
              const shiftOptions = isFixed
                ? fixedShift
                  ? [fixedShift]
                  : []
                : allowedShifts
              return (
                <tr key={worker.id}>
                  <td>{worker.name}</td>
                  <td>{worker.group}</td>
                  <td>{worker.contract}</td>
                  <td>{worker.shiftMode}</td>
                  <td>
                    <div className="field">
                      <select
                        value={currentShift ?? ''}
                        disabled={isFixed}
                        onChange={(event) => handleShiftChange(worker.id, event.target.value)}
                      >
                        <option value="">-</option>
                        {shiftOptions.map((shift) => (
                          <option key={shift} value={shift}>
                            {SHIFT_LABEL[shift]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>{currentShift ? SHIFT_LABEL[currentShift] : '-'}</div>
                  </td>
                  <td>
                    <div className="field">
                      <select
                        value={assignment?.task ?? ''}
                        disabled={!assignment}
                        onChange={(event) => handleTaskChange(worker.id, event.target.value)}
                      >
                        <option value="">-</option>
                        {TASKS_BY_GROUP[worker.group].map((task) => (
                          <option key={task} value={task}>
                            {task}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>{assignment?.task ?? '-'}</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
