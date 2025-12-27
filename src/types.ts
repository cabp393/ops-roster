export type Shift = 'M' | 'T' | 'N'

export type Role = {
  id: string
  code: string
  name: string
  isActive: boolean
  countsForBalance: boolean
}

export type TaskPriority = '' | 'HIGH' | 'MEDIUM' | 'LOW'

// Task priority is defined per shift in Restrictions; defaults are applied when building targets.
export type Task = {
  id: string
  name: string
  allowedRoleCodes: string[]
  isActive: boolean
}

export type Worker = {
  id: number
  name: string
  roleCode: string
  contract: 'Indefinido' | 'Plazo fijo'
  shiftMode: 'Rotativo' | 'Fijo'
  fixedShift?: Shift
  constraints?: {
    allowedShifts?: Shift[]
  }
  specialRole?: string
  isActive?: boolean
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

export type PlanningInput = {
  weekStart: string
  workers: Worker[]
  prevWeekShifts: Record<number, Shift>
  roles: Role[]
  restrictions?: Restrictions | null
}

export type Restrictions = {
  weekStart: string
  demand: {
    shifts: Record<
      Shift,
      {
        roleTargets: Record<
          string,
          {
            min: number
            target: number
            max: number
          }
        >
      }
    >
    tasks: Record<
      Shift,
      Record<
        string,
        {
          max: number
          priority: TaskPriority
        }
      >
    >
  }
  policies: {
    balanceTotals: boolean
    balanceByRole: boolean
    respectFixed: boolean
    respectAllowedShifts: boolean
  }
  profileName?: string
}
