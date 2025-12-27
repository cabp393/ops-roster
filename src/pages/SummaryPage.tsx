import { useEffect, useMemo, useState } from 'react'
import { SHIFTS, SHIFT_LABEL } from '../data/mock'
import { loadWeekPlan } from '../lib/planningBoard'
import {
  formatDate,
  getIsoWeekNumber,
  getIsoWeekYear,
  getWeekRangeLabel,
  getWeekStartDate,
} from '../lib/week'
import { getRoles, getTasks, getWorkers } from '../lib/storage'
import { summarizeWeek } from '../lib/summary'
import type { Assignment, Role, Task, Worker } from '../types'

const fallbackWeekNumber = 1
const fallbackWeekYear = 2025

export function SummaryPage() {
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
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  const weekStart = useMemo(() => {
    const startDate = getWeekStartDate(weekNumber, weekYear)
    return formatDate(startDate)
  }, [weekNumber, weekYear])

  useEffect(() => {
    setWorkers(getWorkers())
    setRoles(getRoles())
    setTasks(getTasks())
  }, [])

  useEffect(() => {
    const saved = loadWeekPlan(weekStart)
    if (!saved) {
      setAssignments(null)
      return
    }
    const nextAssignments: Assignment[] = []
    SHIFTS.forEach((shift) => {
      const workerIds = saved.columns[shift] ?? []
      workerIds.forEach((workerId) => {
        nextAssignments.push({
          workerId,
          weekStart,
          shift,
          taskId: saved.tasksByWorkerId[workerId] ?? undefined,
          source: 'manual',
        })
      })
    })
    setAssignments(nextAssignments)
  }, [weekStart])

  const summary = useMemo(() => {
    if (!assignments) return null
    return summarizeWeek({ weekStart, workers, assignments, roles, tasks })
  }, [assignments, weekStart, workers, roles, tasks])

  const tableRows = useMemo(() => {
    if (!summary) return []
    return summary.tree.flatMap((shift) => {
      if (shift.roles.length === 0) {
        return [
          {
            key: `${shift.shift}-empty`,
            shiftLabel: SHIFT_LABEL[shift.shift],
            roleLabel: '-',
            taskLabel: 'No assignments',
            total: 0,
          },
        ]
      }
      let isFirstShiftRow = true
      return shift.roles.flatMap((role) => {
        let isFirstRoleRow = true
        return role.tasks.map((task) => {
          const row = {
            key: `${shift.shift}-${role.roleCode}-${task.task}`,
            shiftLabel: isFirstShiftRow ? `${SHIFT_LABEL[shift.shift]} (${shift.total})` : '',
            roleLabel: isFirstRoleRow ? `${role.roleName} (${role.total})` : '',
            taskLabel: task.task,
            total: task.total,
          }
          isFirstShiftRow = false
          isFirstRoleRow = false
          return row
        })
      })
    })
  }, [summary])

  return (
    <section>
      <div className="planning-controls">
        <div className="planning-week">
          <label className="field">
            Semana
            <input
              type="number"
              min={1}
              max={53}
              value={weekNumber}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) setWeekNumber(value)
              }}
            />
          </label>
          <label className="field">
            Año
            <input
              type="number"
              min={2000}
              max={2100}
              value={weekYear}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) setWeekYear(value)
              }}
            />
          </label>
          <div className="week-range">Semana {weekNumber}: {getWeekRangeLabel(weekNumber, weekYear)}</div>
        </div>
      </div>
      {!summary ? (
        <p className="summary">No plan found for this week. Generate it in Planning.</p>
      ) : (
        <>
          <p className="summary">
            Totals: {SHIFTS.map((shift) => `${shift}: ${summary.totalsByShift[shift]}`).join(', ')}
          </p>
          {summary.warnings.length > 0 ? (
            <div className="summary">
              <strong>Warnings</strong>
              <ul>
                {summary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Role</th>
                  <th>Task</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.shiftLabel}</td>
                    <td>{row.roleLabel}</td>
                    <td>{row.taskLabel}</td>
                    <td>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
