import { SHIFTS } from '../data/mock'
import type { Shift, WeekPlan, Worker } from '../types'

const PLANNING_PREFIX = 'opsRoster:planning'

function planningKey(weekStart: string) {
  return `${PLANNING_PREFIX}:${weekStart}`
}

const EMPTY_COLUMNS: Record<Shift, number[]> = { M: [], T: [], N: [] }

function normalizeColumns(raw: unknown): Record<Shift, number[]> {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_COLUMNS }
  const record = raw as Record<string, unknown>
  return {
    M: Array.isArray(record.M) ? record.M.filter((id) => typeof id === 'number') : [],
    T: Array.isArray(record.T) ? record.T.filter((id) => typeof id === 'number') : [],
    N: Array.isArray(record.N) ? record.N.filter((id) => typeof id === 'number') : [],
  }
}

function normalizeTasks(raw: unknown): Record<number, string | null> {
  if (!raw || typeof raw !== 'object') return {}
  const record = raw as Record<string, unknown>
  const next: Record<number, string | null> = {}
  Object.entries(record).forEach(([key, value]) => {
    const id = Number(key)
    if (Number.isNaN(id)) return
    if (typeof value === 'string' || value === null) {
      next[id] = value
    }
  })
  return next
}

export function loadWeekPlan(weekStart: string): WeekPlan | null {
  const raw = localStorage.getItem(planningKey(weekStart))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as WeekPlan
    if (!parsed || typeof parsed !== 'object') return null
    return {
      weekStart,
      columns: normalizeColumns(parsed.columns),
      tasksByWorkerId: normalizeTasks(parsed.tasksByWorkerId),
    }
  } catch {
    return null
  }
}

export function saveWeekPlan(weekStart: string, plan: WeekPlan) {
  localStorage.setItem(planningKey(weekStart), JSON.stringify(plan))
}

export function clearWeekPlan(weekStart: string) {
  localStorage.removeItem(planningKey(weekStart))
}

function allowedShiftsForWorker(worker: Worker): Shift[] {
  if (worker.shiftMode === 'Fijo' && worker.fixedShift) return [worker.fixedShift]
  return worker.constraints?.allowedShifts ?? SHIFTS
}

function nextRotatedShift(shift: Shift): Shift {
  if (shift === 'N') return 'T'
  if (shift === 'T') return 'M'
  return 'N'
}

function pickAllowedShift(desired: Shift, allowed: Shift[]): Shift | null {
  if (allowed.includes(desired)) return desired
  const startIndex = SHIFTS.indexOf(desired)
  for (let index = 0; index < SHIFTS.length; index += 1) {
    const shift = SHIFTS[(startIndex + index) % SHIFTS.length]
    if (allowed.includes(shift)) return shift
  }
  return null
}

export function seedWeekPlan(
  weekStart: string,
  workers: Worker[],
  prevWeekShifts: Record<number, Shift>,
): WeekPlan {
  const columns: Record<Shift, number[]> = { M: [], T: [], N: [] }
  const tasksByWorkerId: Record<number, string | null> = {}
  const assigned = new Set<number>()
  const activeWorkers = workers.filter((worker) => worker.isActive !== false)

  activeWorkers
    .filter((worker) => worker.shiftMode === 'Fijo')
    .forEach((worker) => {
      if (!worker.fixedShift) return
      const allowed = allowedShiftsForWorker(worker)
      if (!allowed.includes(worker.fixedShift)) return
      columns[worker.fixedShift].push(worker.id)
      tasksByWorkerId[worker.id] = null
      assigned.add(worker.id)
    })

  activeWorkers
    .filter((worker) => worker.contract === 'Indefinido' && worker.shiftMode === 'Rotativo')
    .forEach((worker) => {
      if (assigned.has(worker.id)) return
      const previous = prevWeekShifts[worker.id]
      if (!previous) return
      const desired = nextRotatedShift(previous)
      const allowed = allowedShiftsForWorker(worker)
      const shift = pickAllowedShift(desired, allowed)
      if (!shift) return
      columns[shift].push(worker.id)
      tasksByWorkerId[worker.id] = null
      assigned.add(worker.id)
    })

  const remaining = activeWorkers.filter((worker) => !assigned.has(worker.id))
  let roundRobinIndex = 0

  remaining.forEach((worker) => {
    const allowed = allowedShiftsForWorker(worker)
    const desired = SHIFTS[roundRobinIndex % SHIFTS.length]
    const shift = pickAllowedShift(desired, allowed)
    roundRobinIndex += 1
    if (!shift) return
    columns[shift].push(worker.id)
    tasksByWorkerId[worker.id] = null
  })

  return { weekStart, columns, tasksByWorkerId }
}
