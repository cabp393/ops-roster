import { useEffect, useMemo, useState } from 'react'
import { SHIFTS, SHIFT_LABEL } from '../data/mock'
import { getPlanning, getRoles, getTasks, getWorkers } from '../lib/storage'
import { summarizeWeek } from '../lib/summary'
import type { Assignment, Role, Task, Worker } from '../types'

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

export function SummaryPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    setWorkers(getWorkers())
    setRoles(getRoles())
    setTasks(getTasks())
  }, [])

  useEffect(() => {
    const saved = getPlanning(weekStart)
    setAssignments(saved?.assignments ?? null)
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
            taskLabel: 'Sin asignaciones',
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
        <label className="field">
          Semana inicio
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>
      </div>
      {!summary ? (
        <p className="summary">No hay plan para esta semana. Généralo en Planificación.</p>
      ) : (
        <>
          <p className="summary">
            Totales: {SHIFTS.map((shift) => `${shift}: ${summary.totalsByShift[shift]}`).join(', ')}
          </p>
          {summary.warnings.length > 0 ? (
            <div className="summary">
              <strong>Alertas</strong>
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
                  <th>Turno</th>
                  <th>Rol</th>
                  <th>Tarea</th>
                  <th>Total</th>
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
