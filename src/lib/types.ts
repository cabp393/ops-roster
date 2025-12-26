import type { Shift, Worker } from '../data/mock'

export type Assignment = {
  workerId: number
  weekStart: string
  shift: Shift
  source: 'generated' | 'manual'
}

export type PlanningInput = {
  weekStart: string
  workers: Worker[]
  prevWeekShifts: Record<number, Shift>
}
