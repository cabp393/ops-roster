import type { Shift, Worker } from '../data/mock'

export type Assignment = {
  workerId: number
  weekStart: string
  shift: Shift
  task?: string
  source: 'generated' | 'manual'
}

export type PlanningRecord = {
  weekStart: string
  assignments: Assignment[]
}

export type PlanningInput = {
  weekStart: string
  workers: Worker[]
  prevWeekShifts: Record<number, Shift>
}
