import { useEffect, useMemo, useState } from 'react'
import { SHIFT_LABEL, SHIFTS, prevWeekShifts, workers } from '../data/mock'
import { generateAssignments } from '../lib/planning'
import { clearPlanning, loadPlanning, savePlanning } from '../lib/storage'
import type { Assignment, Shift } from '../lib/types'

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

function countAssignments(assignments: Assignment[]) {
  const counts: Record<Shift, number> = { M: 0, T: 0, N: 0 }
  assignments.forEach((assignment) => {
    counts[assignment.shift] += 1
  })
  return counts
}

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    const saved = loadPlanning(weekStart)
    setAssignments(saved ?? [])
  }, [weekStart])

  const assignmentsByWorker = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.workerId, assignment]))
  }, [assignments])

  const counts = useMemo(() => countAssignments(assignments), [assignments])

  function handleGenerate() {
    const nextAssignments = generateAssignments({
      weekStart,
      workers,
      prevWeekShifts,
    })
    setAssignments(nextAssignments)
    savePlanning(weekStart, nextAssignments)
  }

  function handleClear() {
    clearPlanning(weekStart)
    setAssignments([])
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
          <button type="button" onClick={handleClear}>
            Clear week
          </button>
        </div>
      </div>
      <p className="summary">
        Summary: {SHIFTS.map((shift) => `${shift}: ${counts[shift]}`).join(', ')}
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Group</th>
              <th>Contract</th>
              <th>Shift Mode</th>
              <th>Assigned Shift</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => {
              const assignment = assignmentsByWorker.get(worker.id)
              return (
                <tr key={worker.id}>
                  <td>{worker.name}</td>
                  <td>{worker.group}</td>
                  <td>{worker.contract}</td>
                  <td>{worker.shiftMode}</td>
                  <td>{assignment ? SHIFT_LABEL[assignment.shift] : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
