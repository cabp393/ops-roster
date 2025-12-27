import type { Assignment, PlanningRecord, Restrictions, Role, Task, Worker } from '../types'
import { defaultRoles, defaultTasks, defaultWorkers } from '../data/mock'

const PLANNING_PREFIX = 'opsRoster:planning'
const ROLES_KEY = 'opsRoster:roles'
const TASKS_KEY = 'opsRoster:tasks'
const WORKERS_KEY = 'opsRoster:workers'
const RESTRICTIONS_PREFIX = 'opsRoster:restrictionPresets'
const RESTRICTIONS_PRESETS_KEY = 'opsRoster:restrictionPresets:list'

function planningKey(weekStart: string) {
  return `${PLANNING_PREFIX}:${weekStart}`
}

function restrictionsKey(profileName: string) {
  return `${RESTRICTIONS_PREFIX}:${profileName}`
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
  return tasks.map((task) => ({
    ...task,
    allowedRoleCodes: Array.isArray(task.allowedRoleCodes) ? task.allowedRoleCodes : [],
    isActive: task.isActive ?? true,
    priority: task.priority ?? 'MEDIUM',
  }))
}

function normalizeWorkers(raw: unknown): Worker[] | null {
  if (!Array.isArray(raw)) return null
  const workers = raw.filter((worker) => worker && typeof worker === 'object') as Worker[]
  if (workers.length === 0) return null
  return workers.map((worker) => {
    const legacyGroup = (worker as { group?: string }).group
    const roleCode = worker.roleCode ?? (legacyGroup === 'Gruero' ? 'OG' : legacyGroup === 'Auxiliar' ? 'AL' : 'AL')
    return {
      ...worker,
      roleCode,
      isActive: worker.isActive ?? true,
    }
  })
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

export function getWorkers(): Worker[] {
  const raw = localStorage.getItem(WORKERS_KEY)
  if (!raw) {
    localStorage.setItem(WORKERS_KEY, JSON.stringify(defaultWorkers))
    return defaultWorkers
  }
  try {
    const parsed = normalizeWorkers(JSON.parse(raw))
    if (parsed) {
      localStorage.setItem(WORKERS_KEY, JSON.stringify(parsed))
      return parsed
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

function normalizePresetNames(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const names = raw.filter((name) => typeof name === 'string' && name.trim().length > 0)
  return names.length > 0 ? names : null
}

function listPresetNamesFromStorage() {
  const names: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(`${RESTRICTIONS_PREFIX}:`)) continue
    const name = key.replace(`${RESTRICTIONS_PREFIX}:`, '')
    if (name) names.push(name)
  }
  return Array.from(new Set(names))
}

export function getRestrictionPresetNames(): string[] {
  const raw = localStorage.getItem(RESTRICTIONS_PRESETS_KEY)
  if (!raw) {
    const derived = listPresetNamesFromStorage()
    if (derived.length > 0) {
      localStorage.setItem(RESTRICTIONS_PRESETS_KEY, JSON.stringify(derived))
    }
    return derived
  }
  try {
    const parsed = normalizePresetNames(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  const derived = listPresetNamesFromStorage()
  if (derived.length > 0) {
    localStorage.setItem(RESTRICTIONS_PRESETS_KEY, JSON.stringify(derived))
  }
  return derived
}

function setRestrictionPresetNames(names: string[]) {
  const unique = Array.from(new Set(names))
  localStorage.setItem(RESTRICTIONS_PRESETS_KEY, JSON.stringify(unique))
}

export function getRestrictionPreset(profileName: string): Restrictions | null {
  if (!profileName) return null
  const raw = localStorage.getItem(restrictionsKey(profileName))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Restrictions
    if (!parsed) return null
    return { ...parsed, profileName }
  } catch {
    return null
  }
}

export function setRestrictionPreset(profileName: string, restrictions: Restrictions) {
  localStorage.setItem(restrictionsKey(profileName), JSON.stringify(restrictions))
  const existing = getRestrictionPresetNames()
  if (!existing.includes(profileName)) {
    setRestrictionPresetNames([...existing, profileName])
  }
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
