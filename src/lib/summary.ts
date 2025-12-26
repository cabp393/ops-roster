import { SHIFT_LABEL, SHIFTS, TASKS_BY_GROUP, type Shift, type Worker } from '../data/mock'
import type { Assignment } from './types'

type SummaryTask = {
  task: string
  total: number
}

type SummaryGroup = {
  group: string
  total: number
  tasks: SummaryTask[]
}

type SummaryShift = {
  shift: Shift
  shiftLabel: string
  total: number
  groups: SummaryGroup[]
}

type SummaryInput = {
  weekStart: string
  workers: Worker[]
  assignments: Assignment[]
}

type SummaryOutput = {
  totalsByShift: Record<Shift, number>
  tree: SummaryShift[]
  warnings: string[]
}

const GROUP_ORDER = ['Gruero', 'Auxiliar']
const UNKNOWN_GROUP = 'Unknown'
const UNASSIGNED_TASK = 'Unassigned'

function compareGroups(a: string, b: string) {
  const aIndex = GROUP_ORDER.indexOf(a)
  const bIndex = GROUP_ORDER.indexOf(b)
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  }
  if (a === UNKNOWN_GROUP) return 1
  if (b === UNKNOWN_GROUP) return -1
  return a.localeCompare(b)
}

function compareTasks(a: SummaryTask, b: SummaryTask) {
  if (b.total !== a.total) return b.total - a.total
  return a.task.localeCompare(b.task)
}

export function summarizeWeek({ workers, assignments }: SummaryInput): SummaryOutput {
  const workerById = new Map(workers.map((worker) => [worker.id, worker]))
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

    const group = worker?.group ?? UNKNOWN_GROUP
    const rawTask = assignment.task?.trim() ?? ''
    let taskLabel = rawTask || UNASSIGNED_TASK

    if (!rawTask) {
      missingTaskCount += 1
    } else if (worker && !TASKS_BY_GROUP[worker.group].includes(rawTask)) {
      invalidTaskCount += 1
      taskLabel = `${rawTask} (invalid)`
    }

    if (!shiftMap.has(assignment.shift)) {
      shiftMap.set(assignment.shift, new Map())
    }
    const groupMap = shiftMap.get(assignment.shift)!
    if (!groupMap.has(group)) {
      groupMap.set(group, new Map())
    }
    const taskMap = groupMap.get(group)!
    taskMap.set(taskLabel, (taskMap.get(taskLabel) ?? 0) + 1)
  })

  const tree = SHIFTS.map((shift) => {
    const groupMap = shiftMap.get(shift) ?? new Map()
    const groups = Array.from(groupMap.entries())
      .map(([group, taskMap]) => {
        const tasks = Array.from(taskMap.entries())
          .map(([task, total]) => ({ task, total }))
          .sort(compareTasks)
        const total = tasks.reduce((sum, task) => sum + task.total, 0)
        return { group, total, tasks }
      })
      .sort((a, b) => compareGroups(a.group, b.group))

    return {
      shift,
      shiftLabel: SHIFT_LABEL[shift],
      total: totalsByShift[shift],
      groups,
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
