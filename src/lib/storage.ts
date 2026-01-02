import type {
  Assignment,
  Equipment,
  EquipmentRoleOption,
  EquipmentStatusOption,
  EquipmentTypeOption,
  EquipmentVariantOption,
  PlanningRecord,
  Role,
  Task,
  Worker,
} from '../types'
import {
  defaultEquipments,
  defaultEquipmentRoles,
  defaultEquipmentStatuses,
  defaultEquipmentTypes,
  defaultEquipmentVariants,
  defaultRoles,
  defaultTasks,
  defaultWorkers,
} from '../data/mock'
import { parseLegacyName } from './workerName'

const PLANNING_PREFIX = 'opsRoster:planning'
const ROLES_KEY = 'opsRoster:roles'
const TASKS_KEY = 'opsRoster:tasks'
const WORKERS_KEY = 'opsRoster:workers'
const EQUIPMENT_KEY = 'opsRoster:equipments'
const EQUIPMENT_ROLES_KEY = 'opsRoster:equipment:roles'
const EQUIPMENT_TYPES_KEY = 'opsRoster:equipment:types'
const EQUIPMENT_VARIANTS_KEY = 'opsRoster:equipment:variants'
const EQUIPMENT_STATUSES_KEY = 'opsRoster:equipment:statuses'

function planningKey(weekStart: string) {
  return `${PLANNING_PREFIX}:${weekStart}`
}


function normalizeRoles(raw: unknown): Role[] | null {
  if (!Array.isArray(raw)) return null
  const roles = raw.filter((role) => role && typeof role === 'object') as Role[]
  if (roles.length === 0) return null
  return roles.map((role) => ({
    ...role,
    isActive: role.isActive ?? true,
    countsForBalance: role.countsForBalance ?? true,
  }))
}

function normalizeTasks(raw: unknown): Task[] | null {
  if (!Array.isArray(raw)) return null
  const tasks = raw.filter((task) => task && typeof task === 'object') as Task[]
  if (tasks.length === 0) return null
  return tasks.map((task) => {
    return {
      ...task,
      allowedRoleCodes: Array.isArray(task.allowedRoleCodes) ? task.allowedRoleCodes : [],
      isActive: task.isActive ?? true,
      equipmentType: typeof task.equipmentType === 'string' ? task.equipmentType : task.equipmentType ?? null,
      equipmentVariant:
        typeof task.equipmentVariant === 'string' ? task.equipmentVariant : task.equipmentVariant ?? null,
    }
  })
}

function normalizeWorkers(raw: unknown): Worker[] | null {
  if (!Array.isArray(raw)) return null
  const workers = raw.filter((worker) => worker && typeof worker === 'object') as Worker[]
  if (workers.length === 0) return null
  return workers.map((worker) => {
    const legacyGroup = (worker as { group?: string }).group
    const roleCode = worker.roleCode ?? (legacyGroup === 'Gruero' ? 'OG' : legacyGroup === 'Auxiliar' ? 'AL' : 'AL')
    const hasStructuredName =
      typeof worker.firstName === 'string' || typeof worker.lastName === 'string' || typeof worker.motherLastName === 'string'
    const parsedName = !hasStructuredName && worker.name ? parseLegacyName(worker.name) : null
    const firstName = (worker.firstName ?? parsedName?.firstName ?? '').trim()
    const secondName = (worker.secondName ?? parsedName?.secondName ?? '').trim()
    const lastName = (worker.lastName ?? parsedName?.lastName ?? '').trim()
    const motherLastName = (worker.motherLastName ?? parsedName?.motherLastName ?? '').trim()
    return {
      ...worker,
      roleCode,
      firstName,
      secondName,
      lastName,
      motherLastName,
      isActive: worker.isActive ?? true,
    }
  })
}

function normalizeEquipmentOptions<T extends { id: string; name?: string; code?: string; isActive?: boolean }>(
  raw: unknown,
): T[] | null {
  if (!Array.isArray(raw)) return null
  const options = raw.filter((option) => option && typeof option === 'object') as T[]
  if (options.length === 0) return null
  return options.map((option) => ({
    ...option,
    isActive: option.isActive ?? true,
  }))
}

function normalizeEquipmentVariants(raw: unknown): EquipmentVariantOption[] | null {
  if (!Array.isArray(raw)) return null
  const options = raw.filter((option) => option && typeof option === 'object') as EquipmentVariantOption[]
  if (options.length === 0) return null
  return options.map((option) => ({
    ...option,
    isActive: option.isActive ?? true,
  }))
}

function normalizeEquipments(raw: unknown): Equipment[] | null {
  if (!Array.isArray(raw)) return null
  const equipments = raw.filter((equipment) => equipment && typeof equipment === 'object') as Equipment[]
  if (equipments.length === 0) return null
  return equipments.map((equipment) => ({
    ...equipment,
    serie: (equipment.serie ?? '').trim(),
    roleCode: (equipment.roleCode ?? '').trim(),
    type: (equipment.type ?? '').trim(),
    variant: (equipment.variant ?? '').trim(),
    status: (equipment.status ?? '').trim(),
  }))
}

export function getRoles(): Role[] {
  const raw = localStorage.getItem(ROLES_KEY)
  if (!raw) {
    localStorage.setItem(ROLES_KEY, JSON.stringify(defaultRoles))
    return defaultRoles
  }
  try {
    const parsed = normalizeRoles(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(ROLES_KEY, JSON.stringify(defaultRoles))
  return defaultRoles
}

export function setRoles(roles: Role[]) {
  localStorage.setItem(ROLES_KEY, JSON.stringify(roles))
}

export function getEquipmentRoles(): EquipmentRoleOption[] {
  const raw = localStorage.getItem(EQUIPMENT_ROLES_KEY)
  if (!raw) {
    localStorage.setItem(EQUIPMENT_ROLES_KEY, JSON.stringify(defaultEquipmentRoles))
    return defaultEquipmentRoles
  }
  try {
    const parsed = normalizeEquipmentOptions<EquipmentRoleOption>(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(EQUIPMENT_ROLES_KEY, JSON.stringify(defaultEquipmentRoles))
  return defaultEquipmentRoles
}

export function setEquipmentRoles(roles: EquipmentRoleOption[]) {
  localStorage.setItem(EQUIPMENT_ROLES_KEY, JSON.stringify(roles))
}

export function getEquipmentTypes(): EquipmentTypeOption[] {
  const raw = localStorage.getItem(EQUIPMENT_TYPES_KEY)
  if (!raw) {
    localStorage.setItem(EQUIPMENT_TYPES_KEY, JSON.stringify(defaultEquipmentTypes))
    return defaultEquipmentTypes
  }
  try {
    const parsed = normalizeEquipmentOptions<EquipmentTypeOption>(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(EQUIPMENT_TYPES_KEY, JSON.stringify(defaultEquipmentTypes))
  return defaultEquipmentTypes
}

export function setEquipmentTypes(types: EquipmentTypeOption[]) {
  localStorage.setItem(EQUIPMENT_TYPES_KEY, JSON.stringify(types))
}

export function getEquipmentVariants(): EquipmentVariantOption[] {
  const raw = localStorage.getItem(EQUIPMENT_VARIANTS_KEY)
  if (!raw) {
    localStorage.setItem(EQUIPMENT_VARIANTS_KEY, JSON.stringify(defaultEquipmentVariants))
    return defaultEquipmentVariants
  }
  try {
    const parsed = normalizeEquipmentVariants(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(EQUIPMENT_VARIANTS_KEY, JSON.stringify(defaultEquipmentVariants))
  return defaultEquipmentVariants
}

export function setEquipmentVariants(variants: EquipmentVariantOption[]) {
  localStorage.setItem(EQUIPMENT_VARIANTS_KEY, JSON.stringify(variants))
}

export function getEquipmentStatuses(): EquipmentStatusOption[] {
  const raw = localStorage.getItem(EQUIPMENT_STATUSES_KEY)
  if (!raw) {
    localStorage.setItem(EQUIPMENT_STATUSES_KEY, JSON.stringify(defaultEquipmentStatuses))
    return defaultEquipmentStatuses
  }
  try {
    const parsed = normalizeEquipmentOptions<EquipmentStatusOption>(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(EQUIPMENT_STATUSES_KEY, JSON.stringify(defaultEquipmentStatuses))
  return defaultEquipmentStatuses
}

export function setEquipmentStatuses(statuses: EquipmentStatusOption[]) {
  localStorage.setItem(EQUIPMENT_STATUSES_KEY, JSON.stringify(statuses))
}

export function getTasks(): Task[] {
  const raw = localStorage.getItem(TASKS_KEY)
  if (!raw) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(defaultTasks))
    return defaultTasks
  }
  try {
    const parsed = normalizeTasks(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(TASKS_KEY, JSON.stringify(defaultTasks))
  return defaultTasks
}

export function setTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function getEquipments(): Equipment[] {
  const raw = localStorage.getItem(EQUIPMENT_KEY)
  if (!raw) {
    localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(defaultEquipments))
    return defaultEquipments
  }
  try {
    const parsed = normalizeEquipments(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(defaultEquipments))
  return defaultEquipments
}

export function setEquipments(equipments: Equipment[]) {
  localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(equipments))
}

export function getWorkers(): Worker[] {
  const raw = localStorage.getItem(WORKERS_KEY)
  if (!raw) {
    localStorage.setItem(WORKERS_KEY, JSON.stringify(defaultWorkers))
    return defaultWorkers
  }
  try {
    const parsed = normalizeWorkers(JSON.parse(raw))
    if (parsed) {
      const tasks = getTasks()
      const withSpecialty = parsed.map((worker) => {
        if (worker.specialtyTaskId) return worker
        const defaultTask = tasks.find((task) => task.allowedRoleCodes.includes(worker.roleCode))
        return {
          ...worker,
          specialtyTaskId: defaultTask?.id ?? null,
        }
      })
      localStorage.setItem(WORKERS_KEY, JSON.stringify(withSpecialty))
      return withSpecialty
    }
  } catch {
    // fall through
  }
  localStorage.setItem(WORKERS_KEY, JSON.stringify(defaultWorkers))
  return defaultWorkers
}

export function setWorkers(workers: Worker[]) {
  localStorage.setItem(WORKERS_KEY, JSON.stringify(workers))
}


function mapLegacyTaskName(tasks: Task[], name: string | undefined): string | undefined {
  if (!name) return undefined
  const match = tasks.find((task) => task.name === name)
  return match?.id
}

function normalizeAssignments(raw: unknown, weekStart: string, tasks: Task[]): Assignment[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((assignment) => assignment && typeof assignment === 'object')
    .map((assignment) => {
      const legacyTask = (assignment as { task?: string }).task
      const taskId = (assignment as Assignment).taskId ?? mapLegacyTaskName(tasks, legacyTask)
      return {
        workerId: (assignment as Assignment).workerId,
        weekStart,
        shift: (assignment as Assignment).shift,
        taskId,
        equipmentId: (assignment as Assignment).equipmentId ?? null,
        source: (assignment as Assignment).source ?? 'manual',
      }
    })
    .filter((assignment) => assignment.workerId != null && assignment.shift != null)
}

export function getPlanning(weekStart: string): PlanningRecord | null {
  const raw = localStorage.getItem(planningKey(weekStart))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PlanningRecord
    if (!parsed || !Array.isArray(parsed.assignments)) {
      return null
    }
    const tasks = getTasks()
    const assignments = normalizeAssignments(parsed.assignments, weekStart, tasks)
    return { weekStart, assignments }
  } catch {
    return null
  }
}

export function setPlanning(weekStart: string, record: PlanningRecord) {
  localStorage.setItem(planningKey(weekStart), JSON.stringify(record))
}

export function clearPlanning(weekStart: string) {
  localStorage.removeItem(planningKey(weekStart))
}
