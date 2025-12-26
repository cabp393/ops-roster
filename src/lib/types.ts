import type { Shift, Worker } from '../data/mock'

export type AssignmentMeta = {
  shiftSource: 'generated' | 'manual'
  taskSource: 'generated' | 'manual'
}

export type Assignment = {
  workerId: number
  weekStart: string
  shift: Shift
  task?: string
  meta: AssignmentMeta
}

export type PlanningRecord = {
  weekStart: string
  assignments: Assignment[]
}

export type PlanningInput = {
  weekStart: string
  workers: Worker[]
  prevWeekShifts: Record<number, Shift>
  existingAssignments?: Assignment[]
}

export type WeekPlanStats = {
  totals: Record<Shift, number>
  perGroup: Record<Worker['group'], Record<Shift, number>>
}

export type WeekPlanResult = {
  assignments: Assignment[]
  warnings: string[]
  stats: WeekPlanStats
}
