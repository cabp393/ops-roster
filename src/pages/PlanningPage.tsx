import { useEffect, useMemo, useState } from 'react'
import { SHIFT_LABEL, SHIFTS, prevWeekShifts } from '../data/mock'
import { generateAssignments } from '../lib/planning'
import {
  clearPlanning,
  getPlanning,
  getRestrictions,
  getRoles,
  getTasks,
  getWorkers,
  setPlanning,
} from '../lib/storage'
import type { Assignment, PlanningRecord, Role, Shift, Task, Worker } from '../types'

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

function makeRecord(weekStart: string, assignments: Assignment[]): PlanningRecord {
  return { weekStart, assignments }
}

function normalizeAssignments(assignments: Assignment[], workers: Worker[], tasks: Task[]) {
  const workerById = new Map(workers.map((worker) => [worker.id, worker]))
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  let invalidCount = 0

  const normalized = assignments.map((assignment) => {
    if (!assignment.taskId) return assignment
    const worker = workerById.get(assignment.workerId)
    const task = taskById.get(assignment.taskId)
    if (!worker || !task || !task.allowedRoleCodes.includes(worker.roleCode)) {
      invalidCount += 1
      return { ...assignment, taskId: undefined }
    }
    return assignment
  })

  return {
    assignments: normalized,
    warnings: invalidCount > 0 ? [`Cleared ${invalidCount} invalid task assignments.`] : [],
  }
}

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [savedLabel, setSavedLabel] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    setRoles(getRoles())
    setTasks(getTasks())
    setWorkers(getWorkers())
  }, [])

  useEffect(() => {
    const saved = getPlanning(weekStart)
    if (!saved) {
      setAssignments([])
      setSavedLabel(null)
      setWarnings([])
      return
    }
    if (workers.length === 0 || tasks.length === 0) {
      setAssignments(saved.assignments)
      setWarnings([])
      setSavedLabel('Saved')
      return
    }
    const normalized = normalizeAssignments(saved.assignments, workers, tasks)
    setAssignments(normalized.assignments)
    setWarnings(normalized.warnings)
    setSavedLabel('Saved')
  }, [weekStart, workers, tasks])

  const assignmentsByWorker = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.workerId, assignment]))
  }, [assignments])

  const counts = useMemo(() => countAssignments(assignments), [assignments])

  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.code, role.name])), [roles])

  const activeTasks = useMemo(() => tasks.filter((task) => task.isActive), [tasks])

  const tasksByRole = useMemo(() => {
    const map = new Map<string, Task[]>()
    activeTasks.forEach((task) => {
      task.allowedRoleCodes.forEach((roleCode) => {
        const existing = map.get(roleCode) ?? []
        existing.push(task)
        map.set(roleCode, existing)
      })
    })
    return map
  }, [activeTasks])

  function persist(nextAssignments: Assignment[]) {
    setAssignments(nextAssignments)
    setPlanning(weekStart, makeRecord(weekStart, nextAssignments))
    setSavedLabel(`Saved ${new Date().toLocaleTimeString()}`)
  }

  function handleGenerate() {
    const restrictions = getRestrictions(weekStart)
    const nextAssignments = generateAssignments({
      weekStart,
      workers,
      prevWeekShifts,
      roles,
      restrictions,
    })
    persist(nextAssignments)
    setWarnings([])
  }

  function handleClear() {
    clearPlanning(weekStart)
    setAssignments([])
    setSavedLabel(null)
    setWarnings([])
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

  function handleTaskChange(workerId: number, taskId: string) {
    const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
    const index = nextAssignments.findIndex((assignment) => assignment.workerId === workerId)
    if (index === -1) return
    nextAssignments[index] = {
      ...nextAssignments[index],
      taskId: taskId || undefined,
      source: 'manual',
    }
    persist(nextAssignments)
  }

  function handleAutoTasks() {
    const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
    const assignmentsMap = new Map(nextAssignments.map((assignment) => [assignment.workerId, assignment]))

    SHIFTS.forEach((shift) => {
      const workersOnShift = workers.filter((worker) => {
        const assignment = assignmentsMap.get(worker.id)
        return assignment?.shift === shift
      })

      const workersByRole = new Map<string, Worker[]>()
      workersOnShift.forEach((worker) => {
        const list = workersByRole.get(worker.roleCode) ?? []
        list.push(worker)
        workersByRole.set(worker.roleCode, list)
      })

      workersByRole.forEach((roleWorkers, roleCode) => {
        const eligibleTasks = tasksByRole.get(roleCode) ?? []
        if (eligibleTasks.length === 0) return
        let taskIndex = 0
        roleWorkers.forEach((worker) => {
          const assignment = assignmentsMap.get(worker.id)
          if (!assignment || assignment.taskId) return
          assignment.taskId = eligibleTasks[taskIndex % eligibleTasks.length].id
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
      {warnings.length > 0 ? (
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
              <th>Role</th>
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
              const shiftOptions = isFixed ? (fixedShift ? [fixedShift] : []) : allowedShifts
              const availableTasks = tasksByRole.get(worker.roleCode) ?? []
              return (
                <tr key={worker.id}>
                  <td>{worker.name}</td>
                  <td>
                    {worker.roleCode}
                    {roleNameByCode.get(worker.roleCode)
                      ? ` (${roleNameByCode.get(worker.roleCode)})`
                      : ''}
                  </td>
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
                        value={assignment?.taskId ?? ''}
                        disabled={!assignment}
                        onChange={(event) => handleTaskChange(worker.id, event.target.value)}
                      >
                        <option value="">-</option>
                        {availableTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      {assignment?.taskId
                        ? tasks.find((task) => task.id === assignment.taskId)?.name ?? 'Unknown'
                        : '-'}
                    </div>
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
