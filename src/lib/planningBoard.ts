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

function normalizeEquipments(raw: unknown): Record<number, string | null> {
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
      equipmentByWorkerId: normalizeEquipments(parsed.equipmentByWorkerId),
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
  return worker.constraints?.allowedShifts ?? SHIFTS
}

function nextRotatedShift(shift: Shift): Shift {
  if (shift === 'N') return 'T'
  if (shift === 'T') return 'M'
  return 'N'
}

function pickAllowedShift(desired: Shift, allowed: Shift[]): Shift | null {
  if (allowed.includes(desired)) return desired
  let current = desired
  for (let index = 0; index < SHIFTS.length; index += 1) {
    current = nextRotatedShift(current)
    if (allowed.includes(current)) return current
  }
  return null
}

function getNextShift(previous: Shift | undefined, allowed: Shift[]): Shift | null {
  if (allowed.length === 0) return null
  if (allowed.length === 1) return allowed[0]
  if (previous && allowed.length === 2 && allowed.includes(previous)) {
    const alternate = allowed.find((shift) => shift !== previous)
    return alternate ?? null
  }
  const desired = previous ? nextRotatedShift(previous) : 'M'
  return pickAllowedShift(desired, allowed)
}

export function getShiftsByWorker(plan: WeekPlan | null): Record<number, Shift> {
  const shifts: Record<number, Shift> = {}
  if (!plan) return shifts
  SHIFTS.forEach((shift) => {
    plan.columns[shift]?.forEach((workerId) => {
      shifts[workerId] = shift
    })
  })
  return shifts
}

export function seedWeekPlan(
  weekStart: string,
  workers: Worker[],
  prevWeekShifts: Record<number, Shift>,
  activeTaskIds: Set<string>,
): WeekPlan {
  const columns: Record<Shift, number[]> = { M: [], T: [], N: [] }
  const tasksByWorkerId: Record<number, string | null> = {}
  const equipmentByWorkerId: Record<number, string | null> = {}
  const activeWorkers = workers.filter((worker) => worker.isActive !== false)

  activeWorkers.forEach((worker) => {
    const previous = prevWeekShifts[worker.id]
    const allowed = allowedShiftsForWorker(worker)
    const shift = getNextShift(previous, allowed)
    if (!shift) return
    columns[shift].push(worker.id)
    if (worker.specialtyTaskId && activeTaskIds.has(worker.specialtyTaskId)) {
      tasksByWorkerId[worker.id] = worker.specialtyTaskId
    } else {
      tasksByWorkerId[worker.id] = null
    }
    equipmentByWorkerId[worker.id] = null
  })

  return { weekStart, columns, tasksByWorkerId, equipmentByWorkerId }
}
