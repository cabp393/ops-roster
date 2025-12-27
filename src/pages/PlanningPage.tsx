import { useEffect, useMemo, useState } from 'react'
import { SHIFT_LABEL, SHIFTS, prevWeekShifts } from '../data/mock'
import { generateAssignments } from '../lib/planning'
import {
  clearPlanning,
  getPlanning,
  getRestrictionPreset,
  getRestrictionPresetNames,
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
    warnings:
      invalidCount > 0 ? [`Se limpiaron ${invalidCount} tareas inválidas para los roles.`] : [],
  }
}

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [savedLabel, setSavedLabel] = useState<string | null>(null)
  const [presetName, setPresetName] = useState('')
  const [presetOptions, setPresetOptions] = useState<string[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    setRoles(getRoles())
    setTasks(getTasks())
    setWorkers(getWorkers())
  }, [])

  useEffect(() => {
    const presets = getRestrictionPresetNames()
    setPresetOptions(presets)
    if (!presetName && presets.length > 0) {
      setPresetName(presets[0])
    }
  }, [presetName])

  useEffect(() => {
    const saved = getPlanning(weekStart)
    if (!saved) {
      setAssignments([])
      setSavedLabel(null)
      return
    }
    if (workers.length === 0 || tasks.length === 0) {
      setAssignments(saved.assignments)
      setSavedLabel('Plan cargado')
      return
    }
    const normalized = normalizeAssignments(saved.assignments, workers, tasks)
    setAssignments(normalized.assignments)
    setSavedLabel('Plan cargado')
  }, [weekStart, workers, tasks])

  const assignmentsByWorker = useMemo(() => {
    return new Map(assignments.map((assignment) => [assignment.workerId, assignment]))
  }, [assignments])

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
    setSavedLabel(`Guardado ${new Date().toLocaleTimeString()}`)
  }

  function handleGenerate() {
    const restrictions = presetName ? getRestrictionPreset(presetName) : null
    const nextAssignments = generateAssignments({
      weekStart,
      workers,
      prevWeekShifts,
      roles,
      restrictions,
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
      <div className="planning-controls">
        <label className="field">
          Semana inicio
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>
        <label className="field">
          Preset
          <select value={presetName} onChange={(event) => setPresetName(event.target.value)}>
            <option value="">Sin preset</option>
            {presetOptions.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button type="button" className="primary" onClick={handleGenerate}>
            Generar turnos
          </button>
          <button type="button" onClick={handleAutoTasks}>
            Asignar tareas
          </button>
          <button type="button" className="ghost" onClick={handleClear}>
            Limpiar semana
          </button>
        </div>
      </div>
      {savedLabel ? <p className="summary">{savedLabel}</p> : null}
      <div className="table-wrap">
        <table className="compact-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Turno</th>
              <th>Tarea</th>
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
                  <td>
                    <div className="field">
                      <select
                        value={currentShift ?? ''}
                        disabled={isFixed}
                        onChange={(event) => handleShiftChange(worker.id, event.target.value)}
                      >
                        <option value="">Sin turno</option>
                        {shiftOptions.map((shift) => (
                          <option key={shift} value={shift}>
                            {SHIFT_LABEL[shift]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="field">
                      <select
                        value={assignment?.taskId ?? ''}
                        disabled={!assignment}
                        onChange={(event) => handleTaskChange(worker.id, event.target.value)}
                      >
                        <option value="">Sin tarea</option>
                        {availableTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.name}
                          </option>
                        ))}
                      </select>
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
