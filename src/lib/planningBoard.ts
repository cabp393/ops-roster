import { SHIFTS } from '../data/mock'
import type { Shift, WeekPlan, Worker } from '../types'
import { supabase } from './supabaseClient'

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

export async function loadWeekPlan(weekStart: string, organizationId: string): Promise<WeekPlan | null> {
  const { data, error } = await supabase
    .from('planning_records')
    .select('week_start, columns, tasks_by_worker_id, equipment_by_worker_id')
    .eq('organization_id', organizationId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    weekStart,
    columns: normalizeColumns(data.columns),
    tasksByWorkerId: normalizeTasks(data.tasks_by_worker_id),
    equipmentByWorkerId: normalizeEquipments(data.equipment_by_worker_id),
  }
}

export async function saveWeekPlan(weekStart: string, plan: WeekPlan, organizationId: string) {
  const { error } = await supabase
    .from('planning_records')
    .upsert(
      {
        organization_id: organizationId,
        week_start: weekStart,
        columns: plan.columns,
        tasks_by_worker_id: plan.tasksByWorkerId,
        equipment_by_worker_id: plan.equipmentByWorkerId,
      },
      { onConflict: 'organization_id,week_start' },
    )
  if (error) throw error
}

export async function clearWeekPlan(weekStart: string, organizationId: string) {
  const { error } = await supabase
    .from('planning_records')
    .delete()
    .eq('organization_id', organizationId)
    .eq('week_start', weekStart)
  if (error) throw error
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

  return {
    weekStart,
    columns,
    tasksByWorkerId,
    equipmentByWorkerId,
  }
}
