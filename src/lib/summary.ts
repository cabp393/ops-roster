import { SHIFT_LABEL, SHIFTS } from '../data/mock'
import type { Assignment, Role, Shift, Task, Worker } from '../types'

type SummaryTask = {
  task: string
  total: number
}

type SummaryRole = {
  roleCode: string
  roleName: string
  total: number
  tasks: SummaryTask[]
}

type SummaryShift = {
  shift: Shift
  shiftLabel: string
  total: number
  roles: SummaryRole[]
}

type SummaryInput = {
  weekStart: string
  workers: Worker[]
  assignments: Assignment[]
  roles: Role[]
  tasks: Task[]
}

type SummaryOutput = {
  totalsByShift: Record<Shift, number>
  tree: SummaryShift[]
  warnings: string[]
}

const UNKNOWN_ROLE = 'Unknown'
const UNASSIGNED_TASK = 'Unassigned'

function compareRoles(a: SummaryRole, b: SummaryRole) {
  if (a.roleCode === UNKNOWN_ROLE) return 1
  if (b.roleCode === UNKNOWN_ROLE) return -1
  return a.roleName.localeCompare(b.roleName)
}

function compareTasks(a: SummaryTask, b: SummaryTask) {
  if (b.total !== a.total) return b.total - a.total
  return a.task.localeCompare(b.task)
}

export function summarizeWeek({ workers, assignments, roles, tasks }: SummaryInput): SummaryOutput {
  const workerById = new Map(workers.map((worker) => [worker.id, worker]))
  const roleByCode = new Map(roles.map((role) => [role.code, role]))
  const taskById = new Map(tasks.map((task) => [task.id, task]))
  const totalsByShift: Record<Shift, number> = { M: 0, T: 0, N: 0 }
  const shiftMap = new Map<Shift, Map<string, Map<string, number>>>()
  const missingWorkerIds = new Set<number>()
  let missingTaskCount = 0
  let invalidTaskCount = 0

  assignments.forEach((assignment) => {
    totalsByShift[assignment.shift] += 1

    const worker = workerById.get(assignment.workerId)
    if (!worker) {
      missingWorkerIds.add(assignment.workerId)
    }

    const roleCode = worker?.roleCode ?? UNKNOWN_ROLE
    const roleName = roleByCode.get(roleCode)?.name ?? roleCode
    const task = assignment.taskId ? taskById.get(assignment.taskId) : null
    let taskLabel = task?.name ?? UNASSIGNED_TASK

    if (!assignment.taskId) {
      missingTaskCount += 1
    } else if (!task || (worker && !task.allowedRoleCodes.includes(worker.roleCode))) {
      invalidTaskCount += 1
      taskLabel = `${task?.name ?? 'Unknown task'} (invalid)`
    }

    if (!shiftMap.has(assignment.shift)) {
      shiftMap.set(assignment.shift, new Map())
    }
    const groupMap = shiftMap.get(assignment.shift)!
    if (!groupMap.has(roleCode)) {
      groupMap.set(roleCode, new Map())
    }
    const taskMap = groupMap.get(roleCode)!
    taskMap.set(taskLabel, (taskMap.get(taskLabel) ?? 0) + 1)
  })

  const tree = SHIFTS.map((shift) => {
    const groupMap = shiftMap.get(shift) ?? new Map()
    const rolesTree = Array.from(groupMap.entries())
      .map(([roleCode, taskMap]) => {
        const tasks = Array.from(taskMap.entries())
          .map(([task, total]) => ({ task, total }))
          .sort(compareTasks)
        const total = tasks.reduce((sum, task) => sum + task.total, 0)
        return { roleCode, roleName: roleByCode.get(roleCode)?.name ?? roleCode, total, tasks }
      })
      .sort(compareRoles)

    return {
      shift,
      shiftLabel: SHIFT_LABEL[shift],
      total: totalsByShift[shift],
      roles: rolesTree,
    }
  })

  const warnings: string[] = []
  if (missingWorkerIds.size > 0) {
    warnings.push(`Assignments for unknown workers: ${Array.from(missingWorkerIds).join(', ')}`)
  }
  if (invalidTaskCount > 0) {
    warnings.push(`Invalid tasks detected: ${invalidTaskCount}.`)
  }
  if (missingTaskCount > 0) {
    warnings.push(`Unassigned tasks: ${missingTaskCount}.`)
  }

  return { totalsByShift, tree, warnings }
}
