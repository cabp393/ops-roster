import { SHIFTS } from '../data/mock'
import type { Assignment, Shift, WeekPlan, Worker } from '../types'
import { getOrganizationMemberRole } from './storage'
import { supabase } from './supabaseClient'

const EMPTY_COLUMNS: Record<Shift, number[]> = { M: [], T: [], N: [] }

type AssignmentRow = {
  worker_id: number
  shift: Assignment['shift']
  task_id: string | null
  equipment_id: string | null
}

function buildPlanFromAssignments(weekStart: string, assignments: AssignmentRow[]): WeekPlan {
  const columns: Record<Shift, number[]> = { ...EMPTY_COLUMNS }
  const tasksByWorkerId: Record<number, string | null> = {}
  const equipmentByWorkerId: Record<number, string | null> = {}
  assignments.forEach((assignment) => {
    columns[assignment.shift].push(assignment.worker_id)
    tasksByWorkerId[assignment.worker_id] = assignment.task_id ?? null
    equipmentByWorkerId[assignment.worker_id] = assignment.equipment_id ?? null
  })
  return {
    weekStart,
    columns,
    tasksByWorkerId,
    equipmentByWorkerId,
  }
}

async function ensureWriteAccess(organizationId: string) {
  const role = await getOrganizationMemberRole(organizationId)
  if (role !== 'editor' && role !== 'owner') {
    throw new Error('No tienes permisos para modificar esta organización.')
  }
}

export function buildAssignmentsFromPlan(plan: WeekPlan, source: Assignment['source'] = 'manual'): Assignment[] {
  const assignments: Assignment[] = []
  SHIFTS.forEach((shift) => {
    plan.columns[shift].forEach((workerId) => {
      assignments.push({
        workerId,
        weekStart: plan.weekStart,
        shift,
        taskId: plan.tasksByWorkerId[workerId] ?? null,
        equipmentId: plan.equipmentByWorkerId[workerId] ?? null,
        source,
      })
    })
  })
  return assignments
}

export async function loadWeekPlan(weekStart: string, organizationId: string): Promise<WeekPlan | null> {
  const { data: record, error: recordError } = await supabase
    .from('planning_records')
    .select('week_start')
    .eq('organization_id', organizationId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (recordError) throw recordError
  if (!record) return null
  const { data, error } = await supabase
    .from('assignments')
    .select('worker_id, shift, task_id, equipment_id, task:tasks(id), equipment:equipments(id)')
    .eq('organization_id', organizationId)
    .eq('week_start', weekStart)
  if (error) throw error
  return buildPlanFromAssignments(weekStart, (data ?? []) as AssignmentRow[])
}

export async function saveWeekPlan(weekStart: string, plan: WeekPlan, organizationId: string) {
  await ensureWriteAccess(organizationId)
  const { error: recordError } = await supabase
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
  if (recordError) throw recordError
  const assignments = buildAssignmentsFromPlan(plan)
  const { data: existing, error: existingError } = await supabase
    .from('assignments')
    .select('worker_id')
    .eq('organization_id', organizationId)
    .eq('week_start', weekStart)
  if (existingError) throw existingError
  const existingIds = new Set((existing ?? []).map((row: { worker_id: number }) => String(row.worker_id)))
  const incomingIds = new Set(assignments.map((assignment) => String(assignment.workerId)))
  const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id))
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('assignments')
      .delete()
      .eq('organization_id', organizationId)
      .eq('week_start', weekStart)
      .in('worker_id', idsToDelete)
    if (deleteError) throw deleteError
  }
  if (assignments.length > 0) {
    const { error: upsertError } = await supabase
      .from('assignments')
      .upsert(
        assignments.map((assignment) => ({
          organization_id: organizationId,
          week_start: assignment.weekStart,
          worker_id: assignment.workerId,
          task_id: assignment.taskId ?? null,
          equipment_id: assignment.equipmentId ?? null,
          shift: assignment.shift,
          source: assignment.source,
        })),
        { onConflict: 'organization_id,week_start,worker_id' },
      )
    if (upsertError) throw upsertError
  }
}

export async function clearWeekPlan(weekStart: string, organizationId: string) {
  await ensureWriteAccess(organizationId)
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
