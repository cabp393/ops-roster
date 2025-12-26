import { useEffect, useMemo, useState } from 'react'
import { SHIFT_LABEL, SHIFTS, TASKS_BY_GROUP, prevWeekShifts, workers } from '../data/mock'
import { generateAssignments } from '../lib/planning'
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

function countAssignments(assignments: Assignment[]) {
  const counts: Record<Shift, number> = { M: 0, T: 0, N: 0 }
  assignments.forEach((assignment) => {
    counts[assignment.shift] += 1
  })
  return counts
}

function makeRecord(weekStart: string, assignments: Assignment[]): PlanningRecord {
  return { weekStart, assignments }
}

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [savedLabel, setSavedLabel] = useState<string | null>(null)

  useEffect(() => {
    const saved = loadPlanning(weekStart)
    setAssignments(saved?.assignments ?? [])
    setSavedLabel(saved ? 'Saved' : null)
  }, [weekStart])

  const assignmentsByWorker = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.workerId, assignment]))
  }, [assignments])

  const counts = useMemo(() => countAssignments(assignments), [assignments])

  function persist(nextAssignments: Assignment[]) {
    setAssignments(nextAssignments)
    savePlanning(weekStart, makeRecord(weekStart, nextAssignments))
    setSavedLabel(`Saved ${new Date().toLocaleTimeString()}`)
  }

  function handleGenerate() {
    const nextAssignments = generateAssignments({
      weekStart,
      workers,
      prevWeekShifts,
    })
    persist(nextAssignments)
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
      nextAssignments[index] = {
        ...nextAssignments[index],
        shift: shift as Shift,
        source: 'manual',
      }
    } else {
      nextAssignments.push({
        workerId,
        weekStart,
        shift: shift as Shift,
        source: 'manual',
      })
    }
    persist(nextAssignments)
  }

  function handleTaskChange(workerId: number, task: string) {
    const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
    const index = nextAssignments.findIndex((assignment) => assignment.workerId === workerId)
    if (index === -1) return
    nextAssignments[index] = {
      ...nextAssignments[index],
      task: task || undefined,
      source: 'manual',
    }
    persist(nextAssignments)
  }

  function handleAutoTasks() {
    const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
    const assignmentsMap = new Map(nextAssignments.map((assignment) => [assignment.workerId, assignment]))

    SHIFTS.forEach((shift) => {
      GROUPS.forEach((group) => {
        const tasks = TASKS_BY_GROUP[group]
        let taskIndex = 0
        workers
          .filter((worker) => worker.group === group)
          .forEach((worker) => {
            const assignment = assignmentsMap.get(worker.id)
            if (!assignment || assignment.shift !== shift) return
            if (assignment.task) return
            assignment.task = tasks[taskIndex % tasks.length]
            taskIndex += 1
          })
      })
    })

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
        Summary: {SHIFTS.map((shift) => `${shift}: ${counts[shift]}`).join(', ')}
      </p>
      {savedLabel ? <p className="summary">{savedLabel}</p> : null}
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
