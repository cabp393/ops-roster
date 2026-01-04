export type Shift = 'M' | 'T' | 'N'

export type OrganizationMemberRole = 'viewer' | 'editor' | 'owner'

export type OrganizationMember = {
  userId: string
  role: OrganizationMemberRole
  createdAt: string
}

export type Role = {
  id: string
  code: string
  name: string
  isActive: boolean
  countsForBalance: boolean
}

export type Task = {
  id: string
  name: string
  allowedRoleCodes: string[]
  isActive: boolean
  equipmentType?: string | null
  equipmentVariant?: string | null
}

export type EquipmentRoleOption = {
  id: string
  code: string
  name: string
  isActive: boolean
}

export type EquipmentTypeOption = {
  id: string
  name: string
  roleCode: string
  isActive: boolean
}

export type EquipmentVariantOption = {
  id: string
  name: string
  type: string
  isActive: boolean
}

export type EquipmentStatusOption = {
  id: string
  name: string
  isActive: boolean
}

export type Equipment = {
  id: string
  serie: string
  roleCode: string
  type: string
  variant: string
  status: string
}

export type Worker = {
  id: number
  name?: string
  firstName: string
  secondName?: string
  lastName: string
  motherLastName?: string
  roleId?: string | null
  roleCode: string
  contract: 'Indefinido' | 'Plazo fijo'
  constraints?: {
    allowedShifts?: Shift[]
  }
  specialtyTaskId?: string | null
  specialRole?: string
  isActive?: boolean
}

export type Assignment = {
  id?: string
  workerId: number
  weekStart: string
  shift: Shift
  taskId: string | null
  equipmentId: string | null
  source: 'generated' | 'manual'
}

export type ShiftHistoryEntry = {
  id: string
  weekStart: string
  workerId: number
  shift: Shift
  taskId: string | null
  equipmentId: string | null
  source: string
  createdAt: string
  taskName?: string | null
  equipmentSerie?: string | null
}

export type PlanningRecord = {
  weekStart: string
  assignments: Assignment[]
}

export type WeekPlan = {
  weekStart: string
  columns: Record<Shift, number[]>
  tasksByWorkerId: Record<number, string | null>
  equipmentByWorkerId: Record<number, string | null>
}
