export type Shift = 'M' | 'T' | 'N'

export type Role = {
  id: string
  code: string
  name: string
  color: string
  isActive: boolean
  countsForBalance: boolean
}

export type Task = {
  id: string
  name: string
  allowedRoleCodes: string[]
  isActive: boolean
}

export type Worker = {
  id: number
  name?: string
  firstName: string
  secondName?: string
  lastName: string
  motherLastName?: string
  roleCode: string
  contract: string
  shiftMode: 'Rotativo' | 'Fijo'
  fixedShift?: Shift
  constraints?: {
    allowedShifts?: Shift[]
  }
  specialtyTaskId?: string | null
  specialRole?: string
  isActive?: boolean
}

export type ContractType = {
  id: string
  name: string
  color: string
}

export type Assignment = {
  workerId: number
  weekStart: string
  shift: Shift
  taskId?: string
  source: 'generated' | 'manual'
}

export type PlanningRecord = {
  weekStart: string
  assignments: Assignment[]
}

export type WeekPlan = {
  weekStart: string
  columns: Record<Shift, number[]>
  tasksByWorkerId: Record<number, string | null>
}
