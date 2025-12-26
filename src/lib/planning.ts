import type { Assignment, AssignmentMeta, PlanningInput, Shift, WeekPlanResult, WeekPlanStats } from './types'
import type { Worker } from '../data/mock'
import { SHIFTS, TASKS_BY_GROUP } from '../data/mock'
import { rotateStable } from './rotation'

const SHIFT_PRIORITY: Shift[] = ['M', 'T', 'N']

type Group = Worker['group']

type BalancingCounts = {
  totals: Record<Shift, number>
  perGroup: Record<Group, Record<Shift, number>>
}

function createEmptyCounts(groups: Group[]): BalancingCounts {
  const totals: Record<Shift, number> = { M: 0, T: 0, N: 0 }
  const perGroup = groups.reduce<BalancingCounts['perGroup']>((acc, group) => {
    acc[group] = { M: 0, T: 0, N: 0 }
    return acc
  }, {})
  return { totals, perGroup }
}

function computeImbalance(counts: Record<Shift, number>): number {
  const values = Object.values(counts)
  return Math.max(...values) - Math.min(...values)
}

function normalizeMeta(meta?: Partial<AssignmentMeta>): AssignmentMeta {
  return {
    shiftSource: meta?.shiftSource ?? 'generated',
    taskSource: meta?.taskSource ?? 'generated',
  }
}

function normalizeAssignment(raw: Assignment | (Assignment & { source?: AssignmentMeta['shiftSource'] })): Assignment {
  const meta = normalizeMeta(raw.meta ?? (raw.source ? { shiftSource: raw.source, taskSource: raw.source } : undefined))
  return {
    workerId: raw.workerId,
    weekStart: raw.weekStart,
    shift: raw.shift,
    task: raw.task,
    meta,
  }
}

function getAllowedShifts(worker: Worker): Shift[] {
  return worker.constraints?.allowedShifts?.length ? worker.constraints.allowedShifts : SHIFTS
}

function chooseBalancedShift(
  allowed: Shift[],
  counts: BalancingCounts,
  group: Group,
): Shift {
  const candidates = allowed.length ? allowed : SHIFTS
  const sorted = [...candidates].sort((a, b) => {
    const totalCountsA = counts.totals[a] + 1
    const totalCountsB = counts.totals[b] + 1
    const totalsAfterA = { ...counts.totals, [a]: totalCountsA }
    const totalsAfterB = { ...counts.totals, [b]: totalCountsB }
    const groupCountsA = counts.perGroup[group][a] + 1
    const groupCountsB = counts.perGroup[group][b] + 1
    const groupAfterA = { ...counts.perGroup[group], [a]: groupCountsA }
    const groupAfterB = { ...counts.perGroup[group], [b]: groupCountsB }

    const totalImbalanceDiff = computeImbalance(totalsAfterA) - computeImbalance(totalsAfterB)
    if (totalImbalanceDiff !== 0) return totalImbalanceDiff

    const groupImbalanceDiff = computeImbalance(groupAfterA) - computeImbalance(groupAfterB)
    if (groupImbalanceDiff !== 0) return groupImbalanceDiff

    if (totalCountsA !== totalCountsB) return totalCountsA - totalCountsB
    if (groupCountsA !== groupCountsB) return groupCountsA - groupCountsB
    return SHIFT_PRIORITY.indexOf(a) - SHIFT_PRIORITY.indexOf(b)
  })

  return sorted[0]
}

function applyAssignment(
  assignments: Assignment[],
  counts: BalancingCounts,
  worker: Worker,
  shift: Shift,
  meta: AssignmentMeta,
  task?: string,
) {
  assignments.push({
    workerId: worker.id,
    weekStart: '',
    shift,
    task,
    meta,
  })
  counts.totals[shift] += 1
  counts.perGroup[worker.group][shift] += 1
}

function finalizeAssignments(assignments: Assignment[], weekStart: string): Assignment[] {
  return assignments.map((assignment) => ({
    ...assignment,
    weekStart,
  }))
}

export function computeWeekStats(assignments: Assignment[], workers: Worker[]): WeekPlanStats {
  const groups = Array.from(new Set(workers.map((worker) => worker.group)))
  const counts = createEmptyCounts(groups)
  const workersById = new Map(workers.map((worker) => [worker.id, worker]))

  assignments.forEach((assignment) => {
    const worker = workersById.get(assignment.workerId)
    if (!worker) return
    counts.totals[assignment.shift] += 1
    counts.perGroup[worker.group][assignment.shift] += 1
  })

  return {
    totals: counts.totals,
    perGroup: counts.perGroup,
  }
}

export function validateWeekPlan(
  assignments: Assignment[],
  workers: Worker[],
  prevWeekShifts: Record<number, Shift> = {},
  tasksByGroup: Record<Group, string[]> = TASKS_BY_GROUP,
): string[] {
  const warnings: string[] = []
  const workersById = new Map(workers.map((worker) => [worker.id, worker]))

  assignments.forEach((rawAssignment) => {
    const assignment = normalizeAssignment(rawAssignment)
    const worker = workersById.get(assignment.workerId)
    if (!worker) return

    const allowed = getAllowedShifts(worker)
    if (worker.shiftMode === 'Fijo' && worker.fixedShift && assignment.shift !== worker.fixedShift) {
      warnings.push(`Fixed shift mismatch for ${worker.name}: expected ${worker.fixedShift}, got ${assignment.shift}.`)
    }

    if (!allowed.includes(assignment.shift)) {
      warnings.push(`Constraint violation for ${worker.name}: ${assignment.shift} is not allowed.`)
    }

    if (worker.contract === 'Indefinido' && worker.shiftMode === 'Rotativo') {
      const prevShift = prevWeekShifts[worker.id]
      if (prevShift) {
        const desired = rotateStable(prevShift)
        if (allowed.includes(desired) && assignment.shift !== desired) {
          warnings.push(`Rotation mismatch for ${worker.name}: expected ${desired} after ${prevShift}.`)
        }
        if (!allowed.includes(desired) && assignment.shift !== desired) {
          warnings.push(
            `Rotation blocked for ${worker.name}: ${desired} is disallowed, assigned ${assignment.shift}.`,
          )
        }
      }
    }

    if (assignment.task) {
      const tasks = tasksByGroup[worker.group] ?? []
      if (!tasks.includes(assignment.task)) {
        warnings.push(`Invalid task for ${worker.name}: ${assignment.task} is not in ${worker.group} tasks.`)
      }
    }
  })

  const stats = computeWeekStats(assignments, workers)
  const totalImbalance = computeImbalance(stats.totals)
  if (totalImbalance > 1) {
    warnings.push(`Total shift balance is off by ${totalImbalance}.`)
  }

  Object.entries(stats.perGroup).forEach(([group, counts]) => {
    const imbalance = computeImbalance(counts)
    if (imbalance > 1) {
      warnings.push(`Group ${group} shift balance is off by ${imbalance}.`)
    }
  })

  return warnings
}

export function generateWeekPlan({ weekStart, workers, prevWeekShifts, existingAssignments }: PlanningInput): WeekPlanResult {
  const warnings: string[] = []
  const orderedWorkers = [...workers].sort((a, b) => a.id - b.id)
  const groups = Array.from(new Set(orderedWorkers.map((worker) => worker.group)))
  const counts = createEmptyCounts(groups)
  const assignments: Assignment[] = []

  const existingById = new Map(
    existingAssignments?.map((assignment) => [assignment.workerId, normalizeAssignment(assignment)]) ?? [],
  )

  const flexibleWorkers: Worker[] = []

  orderedWorkers.forEach((worker) => {
    const existing = existingById.get(worker.id)
    const meta = normalizeMeta(existing?.meta)
    const manualShift = meta.shiftSource === 'manual' ? existing?.shift : undefined
    const manualTask = meta.taskSource === 'manual' ? existing?.task : undefined
    const allowed = getAllowedShifts(worker)

    if (worker.shiftMode === 'Fijo' && worker.fixedShift) {
      if (manualShift && manualShift !== worker.fixedShift) {
        warnings.push(`Manual shift ignored for ${worker.name}: fixed shift is ${worker.fixedShift}.`)
      }
      if (!allowed.includes(worker.fixedShift)) {
        warnings.push(`Fixed shift for ${worker.name} violates constraints.`)
      }
      applyAssignment(assignments, counts, worker, worker.fixedShift, { shiftSource: 'generated', taskSource: meta.taskSource }, manualTask)
      return
    }

    if (manualShift) {
      if (!allowed.includes(manualShift)) {
        warnings.push(`Manual shift for ${worker.name} violates constraints.`)
      }
      applyAssignment(assignments, counts, worker, manualShift, { shiftSource: 'manual', taskSource: meta.taskSource }, manualTask)
      return
    }

    if (worker.contract === 'Indefinido' && worker.shiftMode === 'Rotativo') {
      const prevShift = prevWeekShifts[worker.id]
      if (prevShift) {
        const desired = rotateStable(prevShift)
        if (allowed.includes(desired)) {
          applyAssignment(assignments, counts, worker, desired, { shiftSource: 'generated', taskSource: meta.taskSource }, manualTask)
        } else {
          const shift = chooseBalancedShift(allowed, counts, worker.group)
          warnings.push(
            `Rotation for ${worker.name} blocked by constraints: ${desired} not allowed, assigned ${shift}.`,
          )
          applyAssignment(assignments, counts, worker, shift, { shiftSource: 'generated', taskSource: meta.taskSource }, manualTask)
        }
      } else {
        const shift = chooseBalancedShift(allowed, counts, worker.group)
        applyAssignment(assignments, counts, worker, shift, { shiftSource: 'generated', taskSource: meta.taskSource }, manualTask)
      }
      return
    }

    flexibleWorkers.push(worker)
  })

  flexibleWorkers.forEach((worker) => {
    const existing = existingById.get(worker.id)
    const meta = normalizeMeta(existing?.meta)
    const manualTask = meta.taskSource === 'manual' ? existing?.task : undefined
    const allowed = getAllowedShifts(worker)
    const shift = chooseBalancedShift(allowed, counts, worker.group)
    applyAssignment(assignments, counts, worker, shift, { shiftSource: 'generated', taskSource: meta.taskSource }, manualTask)
  })

  const finalized = finalizeAssignments(assignments, weekStart)
  const stats = computeWeekStats(finalized, workers)
  const balanceWarnings = validateWeekPlan(finalized, workers, prevWeekShifts)
  warnings.push(...balanceWarnings)

  return {
    assignments: finalized,
    warnings: Array.from(new Set(warnings)),
    stats,
  }
}

export function autoAssignTasks(
  assignments: Assignment[],
  workers: Worker[],
  tasksByGroup: Record<Group, string[]> = TASKS_BY_GROUP,
): Assignment[] {
  const nextAssignments = assignments.map((assignment) => normalizeAssignment(assignment))
  const assignmentsMap = new Map(nextAssignments.map((assignment) => [assignment.workerId, assignment]))
  const workersByGroup = new Map<Group, Worker[]>()

  workers.forEach((worker) => {
    const list = workersByGroup.get(worker.group) ?? []
    list.push(worker)
    workersByGroup.set(worker.group, list)
  })

  workersByGroup.forEach((groupWorkers, group) => {
    const tasks = tasksByGroup[group] ?? []
    const sortedWorkers = [...groupWorkers].sort((a, b) => a.id - b.id)

    SHIFTS.forEach((shift) => {
      let taskIndex = 0
      sortedWorkers.forEach((worker) => {
        const assignment = assignmentsMap.get(worker.id)
        if (!assignment || assignment.shift !== shift) return

        const meta = normalizeMeta(assignment.meta)
        if (meta.taskSource === 'manual') return

        if (worker.specialRole === 'Control') {
          const controlTask = tasks.find((task) => task === 'Control')
          if (controlTask) {
            assignment.task = controlTask
            assignment.meta = { ...meta, taskSource: 'generated' }
            return
          }
          if (assignment.task) {
            return
          }
          return
        }

        if (!tasks.length) return
        assignment.task = tasks[taskIndex % tasks.length]
        assignment.meta = { ...meta, taskSource: 'generated' }
        taskIndex += 1
      })
    })
  })

  return nextAssignments
}

export function rebalanceWeekPlan(
  assignments: Assignment[],
  workers: Worker[],
  strategy: 'balance' = 'balance',
): Assignment[] {
  if (strategy !== 'balance') return assignments

  const normalized = assignments.map((assignment) => normalizeAssignment(assignment))
  const workersById = new Map(workers.map((worker) => [worker.id, worker]))
  const groups = Array.from(new Set(workers.map((worker) => worker.group)))
  const counts = createEmptyCounts(groups)

  const lockedAssignments = new Set<number>()

  normalized.forEach((assignment) => {
    const worker = workersById.get(assignment.workerId)
    if (!worker) return
    const meta = normalizeMeta(assignment.meta)
    if (meta.shiftSource === 'manual' || worker.shiftMode === 'Fijo' || worker.contract === 'Indefinido') {
      lockedAssignments.add(worker.id)
      counts.totals[assignment.shift] += 1
      counts.perGroup[worker.group][assignment.shift] += 1
    }
  })

  normalized.forEach((assignment) => {
    const worker = workersById.get(assignment.workerId)
    if (!worker || lockedAssignments.has(worker.id)) return
    const allowed = getAllowedShifts(worker)
    const shift = chooseBalancedShift(allowed, counts, worker.group)
    assignment.shift = shift
    assignment.meta = { ...normalizeMeta(assignment.meta), shiftSource: 'generated' }
    counts.totals[shift] += 1
    counts.perGroup[worker.group][shift] += 1
  })

  return normalized
}
