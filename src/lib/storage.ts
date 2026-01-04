import type {
  Assignment,
  Equipment,
  EquipmentRoleOption,
  EquipmentStatusOption,
  EquipmentTypeOption,
  EquipmentVariantOption,
  PlanningRecord,
  Role,
  OrganizationMember,
  OrganizationMemberRole,
  ShiftHistoryEntry,
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
import { supabase } from './supabaseClient'

function ensureOrganizationId(organizationId: string) {
  if (!organizationId) throw new Error('Organization id is required')
  return organizationId
}

const WRITE_ROLES = new Set<OrganizationMemberRole>(['editor', 'owner'])

function normalizeMemberRole(role: string | null | undefined): OrganizationMemberRole | null {
  if (!role) return null
  if (role === 'member') return 'viewer'
  if (role === 'viewer' || role === 'editor' || role === 'owner') return role
  return null
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user?.id ?? null
}

export async function getOrganizationMemberRole(
  organizationId: string,
): Promise<OrganizationMemberRole | null> {
  const orgId = ensureOrganizationId(organizationId)
  const userId = await getCurrentUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return normalizeMemberRole(data?.role)
}

async function canWriteOrganization(organizationId: string) {
  const role = await getOrganizationMemberRole(organizationId)
  return role ? WRITE_ROLES.has(role) : false
}

async function ensureWriteAccess(organizationId: string) {
  const hasAccess = await canWriteOrganization(organizationId)
  if (!hasAccess) {
    throw new Error('No tienes permisos para modificar esta organización.')
  }
}

type RoleRow = {
  id: string
  code: string
  name: string
  is_active: boolean | null
  counts_for_balance: boolean | null
}

type TaskRow = {
  id: string
  name: string
  allowed_role_codes: string[] | null
  is_active: boolean | null
  equipment_type: string | null
  equipment_variant: string | null
}

type WorkerRow = {
  id: number
  name?: string | null
  first_name?: string | null
  second_name?: string | null
  last_name?: string | null
  mother_last_name?: string | null
  role_id?: string | null
  contract?: Worker['contract'] | null
  constraints?: Worker['constraints'] | null
  specialty_task_id?: string | null
  special_role?: string | null
  is_active?: boolean | null
  role?: {
    id: string
    code: string
    name: string
  } | null
}

type EquipmentRow = {
  id: string
  serie: string | null
  role_code: string | null
  type: string | null
  variant: string | null
  status: string | null
}

type EquipmentRoleRow = {
  id: string
  code: string
  name: string
  is_active: boolean | null
}

type EquipmentTypeRow = {
  id: string
  name: string
  role_code: string | null
  is_active: boolean | null
}

type EquipmentVariantRow = {
  id: string
  name: string
  type: string
  is_active: boolean | null
}

type EquipmentStatusRow = {
  id: string
  name: string
  is_active: boolean | null
}

type AssignmentRow = {
  id?: string
  week_start: string
  worker_id: number
  task_id: string | null
  equipment_id: string | null
  shift: Assignment['shift']
  source: Assignment['source']
}

type ShiftHistoryRow = {
  id: string
  week_start: string
  worker_id: number
  task_id: string | null
  equipment_id: string | null
  shift: Assignment['shift']
  source: string
  created_at: string
  task?: { id: string; name: string } | null
  equipment?: { id: string; serie: string } | null
}

type OrganizationMemberRow = {
  user_id: string
  role: string
  created_at: string
}

async function fetchRows<T>(table: string, organizationId: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('organization_id', organizationId)
  if (error) throw error
  return data ?? []
}

async function seedTable<T, R>(
  table: string,
  organizationId: string,
  defaults: T[],
  toRow: (item: T, orgId: string) => R,
  fromRow: (row: R) => T,
  options?: { canWrite?: boolean },
): Promise<T[]> {
  const existing = await fetchRows<R>(table, organizationId)
  if (existing.length > 0) {
    return existing.map((row) => fromRow(row))
  }
  if (options?.canWrite === false) {
    return []
  }
  const { data, error } = await supabase
    .from(table)
    .insert(defaults.map((item) => toRow(item, organizationId)))
    .select('*')
  if (error) throw error
  return (data ?? []).map((row) => fromRow(row as R))
}

async function syncTable<T extends { id: string | number }, R>(
  table: string,
  organizationId: string,
  rows: T[],
  toRow: (item: T, orgId: string) => R,
) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('organization_id', organizationId)
  if (error) throw error
  const existingIds = new Set((data ?? []).map((row: { id: string | number }) => String(row.id)))
  const incomingIds = new Set(rows.map((row) => String(row.id)))
  const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id))
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('organization_id', organizationId)
      .in('id', idsToDelete)
    if (deleteError) throw deleteError
  }
  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from(table)
      .upsert(rows.map((row) => toRow(row, organizationId)), {
        onConflict: 'organization_id,id',
      })
    if (upsertError) throw upsertError
  }
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
      typeof worker.firstName === 'string' ||
      typeof worker.lastName === 'string' ||
      typeof worker.motherLastName === 'string'
    const parsedName = !hasStructuredName && worker.name ? parseLegacyName(worker.name) : null
    const firstName = (worker.firstName ?? parsedName?.firstName ?? '').trim()
    const secondName = (worker.secondName ?? parsedName?.secondName ?? '').trim()
    const lastName = (worker.lastName ?? parsedName?.lastName ?? '').trim()
    const motherLastName = (worker.motherLastName ?? parsedName?.motherLastName ?? '').trim()
    return {
      ...worker,
      roleId: worker.roleId ?? null,
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

function normalizeEquipmentTypes(raw: unknown): EquipmentTypeOption[] | null {
  const options = normalizeEquipmentOptions<EquipmentTypeOption>(raw)
  if (!options) return null
  return options.map((option) => ({
    ...option,
    roleCode: typeof option.roleCode === 'string' ? option.roleCode : '',
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

function roleFromRow(row: RoleRow): Role {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active ?? true,
    countsForBalance: row.counts_for_balance ?? true,
  }
}

function roleToRow(role: Role, organizationId: string) {
  return {
    id: role.id,
    organization_id: organizationId,
    code: role.code,
    name: role.name,
    is_active: role.isActive,
    counts_for_balance: role.countsForBalance,
  }
}

function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    name: row.name,
    allowedRoleCodes: row.allowed_role_codes ?? [],
    isActive: row.is_active ?? true,
    equipmentType: row.equipment_type ?? null,
    equipmentVariant: row.equipment_variant ?? null,
  }
}

function taskToRow(task: Task, organizationId: string) {
  return {
    id: task.id,
    organization_id: organizationId,
    name: task.name,
    allowed_role_codes: task.allowedRoleCodes,
    is_active: task.isActive,
    equipment_type: task.equipmentType ?? null,
    equipment_variant: task.equipmentVariant ?? null,
  }
}

function workerFromRow(row: WorkerRow): Worker {
  return {
    id: row.id,
    name: row.name ?? undefined,
    firstName: row.first_name ?? '',
    secondName: row.second_name ?? undefined,
    lastName: row.last_name ?? '',
    motherLastName: row.mother_last_name ?? undefined,
    roleId: row.role_id ?? row.role?.id ?? null,
    roleCode: row.role?.code ?? '',
    contract: row.contract ?? 'Indefinido',
    constraints: row.constraints ?? undefined,
    specialtyTaskId: row.specialty_task_id ?? null,
    specialRole: row.special_role ?? undefined,
    isActive: row.is_active ?? true,
  }
}

function workerToRow(worker: Worker, organizationId: string) {
  return {
    id: worker.id,
    organization_id: organizationId,
    name: worker.name ?? null,
    first_name: worker.firstName,
    second_name: worker.secondName ?? null,
    last_name: worker.lastName,
    mother_last_name: worker.motherLastName ?? null,
    role_id: worker.roleId,
    contract: worker.contract,
    constraints: worker.constraints ?? null,
    specialty_task_id: worker.specialtyTaskId ?? null,
    special_role: worker.specialRole ?? null,
    is_active: worker.isActive ?? true,
  }
}

function equipmentFromRow(row: EquipmentRow): Equipment {
  return {
    id: row.id,
    serie: row.serie ?? '',
    roleCode: row.role_code ?? '',
    type: row.type ?? '',
    variant: row.variant ?? '',
    status: row.status ?? '',
  }
}

function equipmentToRow(equipment: Equipment, organizationId: string) {
  return {
    id: equipment.id,
    organization_id: organizationId,
    serie: equipment.serie,
    role_code: equipment.roleCode,
    type: equipment.type,
    variant: equipment.variant,
    status: equipment.status,
  }
}

function equipmentRoleFromRow(row: EquipmentRoleRow): EquipmentRoleOption {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.is_active ?? true,
  }
}

function equipmentRoleToRow(role: EquipmentRoleOption, organizationId: string) {
  return {
    id: role.id,
    organization_id: organizationId,
    code: role.code,
    name: role.name,
    is_active: role.isActive,
  }
}

function equipmentTypeFromRow(row: EquipmentTypeRow): EquipmentTypeOption {
  return {
    id: row.id,
    name: row.name,
    roleCode: row.role_code ?? '',
    isActive: row.is_active ?? true,
  }
}

function equipmentTypeToRow(type: EquipmentTypeOption, organizationId: string) {
  return {
    id: type.id,
    organization_id: organizationId,
    name: type.name,
    role_code: type.roleCode,
    is_active: type.isActive,
  }
}

function equipmentVariantFromRow(row: EquipmentVariantRow): EquipmentVariantOption {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    isActive: row.is_active ?? true,
  }
}

function equipmentVariantToRow(variant: EquipmentVariantOption, organizationId: string) {
  return {
    id: variant.id,
    organization_id: organizationId,
    name: variant.name,
    type: variant.type,
    is_active: variant.isActive,
  }
}

function equipmentStatusFromRow(row: EquipmentStatusRow): EquipmentStatusOption {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active ?? true,
  }
}

function equipmentStatusToRow(status: EquipmentStatusOption, organizationId: string) {
  return {
    id: status.id,
    organization_id: organizationId,
    name: status.name,
    is_active: status.isActive,
  }
}

function resolveWorkerRoleId(worker: Worker, roleByCode: Map<string, string>, fallbackRoleId: string | null) {
  return worker.roleId ?? roleByCode.get(worker.roleCode) ?? fallbackRoleId ?? null
}

function assignmentFromRow(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    weekStart: row.week_start,
    workerId: row.worker_id,
    taskId: row.task_id ?? null,
    equipmentId: row.equipment_id ?? null,
    shift: row.shift,
    source: row.source,
  }
}

function assignmentToRow(assignment: Assignment, organizationId: string) {
  return {
    id: assignment.id,
    organization_id: organizationId,
    week_start: assignment.weekStart,
    worker_id: assignment.workerId,
    task_id: assignment.taskId ?? null,
    equipment_id: assignment.equipmentId ?? null,
    shift: assignment.shift,
    source: assignment.source,
  }
}

function shiftHistoryFromRow(row: ShiftHistoryRow): ShiftHistoryEntry {
  return {
    id: row.id,
    weekStart: row.week_start,
    workerId: row.worker_id,
    taskId: row.task_id ?? null,
    equipmentId: row.equipment_id ?? null,
    shift: row.shift,
    source: row.source,
    createdAt: row.created_at,
    taskName: row.task?.name ?? null,
    equipmentSerie: row.equipment?.serie ?? null,
  }
}

function shiftHistoryToRow(assignment: Assignment, organizationId: string) {
  return {
    organization_id: organizationId,
    week_start: assignment.weekStart,
    worker_id: assignment.workerId,
    task_id: assignment.taskId ?? null,
    equipment_id: assignment.equipmentId ?? null,
    shift: assignment.shift,
    source: assignment.source,
  }
}

export async function createOrganizationWithOwner(name: string) {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('El nombre de la organización es obligatorio.')
  const { data, error } = await supabase.rpc('create_organization_with_owner', {
    organization_name: trimmedName,
  })
  if (error) throw error
  if (!data || data.length === 0) throw new Error('No se pudo crear la organización.')
  return data[0]
}

export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const orgId = ensureOrganizationId(organizationId)
  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', orgId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    role: normalizeMemberRole(row.role) ?? 'viewer',
    createdAt: row.created_at,
  }))
}

export async function upsertOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrganizationMemberRole,
) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  const trimmedUserId = userId.trim()
  if (!trimmedUserId) throw new Error('El identificador de usuario es obligatorio.')
  const { error } = await supabase.from('organization_members').upsert(
    {
      organization_id: orgId,
      user_id: trimmedUserId,
      role,
    },
    { onConflict: 'organization_id,user_id' },
  )
  if (error) throw error
}

export async function getRoles(organizationId: string): Promise<Role[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const roles = await seedTable<Role, RoleRow>('roles', orgId, defaultRoles, roleToRow, roleFromRow, {
    canWrite,
  })
  return normalizeRoles(roles) ?? roles
}

export async function setRoles(roles: Role[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<Role, ReturnType<typeof roleToRow>>('roles', orgId, roles, roleToRow)
}

export async function getEquipmentRoles(organizationId: string): Promise<EquipmentRoleOption[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const roles = await seedTable<EquipmentRoleOption, EquipmentRoleRow>(
    'equipment_roles',
    orgId,
    defaultEquipmentRoles,
    equipmentRoleToRow,
    equipmentRoleFromRow,
    { canWrite },
  )
  return normalizeEquipmentOptions<EquipmentRoleOption>(roles) ?? roles
}

export async function setEquipmentRoles(roles: EquipmentRoleOption[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<EquipmentRoleOption, ReturnType<typeof equipmentRoleToRow>>(
    'equipment_roles',
    orgId,
    roles,
    equipmentRoleToRow,
  )
}

export async function getEquipmentTypes(organizationId: string): Promise<EquipmentTypeOption[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const types = await seedTable<EquipmentTypeOption, EquipmentTypeRow>(
    'equipment_types',
    orgId,
    defaultEquipmentTypes,
    equipmentTypeToRow,
    equipmentTypeFromRow,
    { canWrite },
  )
  return normalizeEquipmentTypes(types) ?? types
}

export async function setEquipmentTypes(types: EquipmentTypeOption[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<EquipmentTypeOption, ReturnType<typeof equipmentTypeToRow>>(
    'equipment_types',
    orgId,
    types,
    equipmentTypeToRow,
  )
}

export async function getEquipmentVariants(organizationId: string): Promise<EquipmentVariantOption[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const variants = await seedTable<EquipmentVariantOption, EquipmentVariantRow>(
    'equipment_variants',
    orgId,
    defaultEquipmentVariants,
    equipmentVariantToRow,
    equipmentVariantFromRow,
    { canWrite },
  )
  return normalizeEquipmentVariants(variants) ?? variants
}

export async function setEquipmentVariants(variants: EquipmentVariantOption[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<EquipmentVariantOption, ReturnType<typeof equipmentVariantToRow>>(
    'equipment_variants',
    orgId,
    variants,
    equipmentVariantToRow,
  )
}

export async function getEquipmentStatuses(organizationId: string): Promise<EquipmentStatusOption[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const statuses = await seedTable<EquipmentStatusOption, EquipmentStatusRow>(
    'equipment_statuses',
    orgId,
    defaultEquipmentStatuses,
    equipmentStatusToRow,
    equipmentStatusFromRow,
    { canWrite },
  )
  return normalizeEquipmentOptions<EquipmentStatusOption>(statuses) ?? statuses
}

export async function setEquipmentStatuses(statuses: EquipmentStatusOption[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<EquipmentStatusOption, ReturnType<typeof equipmentStatusToRow>>(
    'equipment_statuses',
    orgId,
    statuses,
    equipmentStatusToRow,
  )
}

export async function getTasks(organizationId: string): Promise<Task[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const tasks = await seedTable<Task, TaskRow>('tasks', orgId, defaultTasks, taskToRow, taskFromRow, {
    canWrite,
  })
  return normalizeTasks(tasks) ?? tasks
}

export async function setTasks(tasks: Task[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<Task, ReturnType<typeof taskToRow>>('tasks', orgId, tasks, taskToRow)
}

export async function getEquipments(organizationId: string): Promise<Equipment[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const equipments = await seedTable<Equipment, EquipmentRow>(
    'equipments',
    orgId,
    defaultEquipments,
    equipmentToRow,
    equipmentFromRow,
    { canWrite },
  )
  return normalizeEquipments(equipments) ?? equipments
}

export async function setEquipments(equipments: Equipment[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  await syncTable<Equipment, ReturnType<typeof equipmentToRow>>('equipments', orgId, equipments, equipmentToRow)
}

export async function getWorkers(organizationId: string): Promise<Worker[]> {
  const orgId = ensureOrganizationId(organizationId)
  const canWrite = await canWriteOrganization(orgId)
  const roles = await getRoles(orgId)
  if (roles.length === 0 && !canWrite) {
    return []
  }
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]))
  const fallbackRoleId = roles[0]?.id ?? null
  const { data: existing, error: existingError } = await supabase
    .from('workers')
    .select('id')
    .eq('organization_id', orgId)
    .limit(1)
  if (existingError) throw existingError
  if (!existing || existing.length === 0) {
    if (!canWrite) return []
    const rows = defaultWorkers.map((worker) => ({
      ...worker,
      roleId: resolveWorkerRoleId(worker, roleByCode, fallbackRoleId),
    }))
    if (rows.some((worker) => !worker.roleId)) {
      throw new Error('Role id is required for workers')
    }
    const { error: insertError } = await supabase
      .from('workers')
      .insert(rows.map((worker) => workerToRow(worker, orgId)))
    if (insertError) throw insertError
  }
  const { data, error } = await supabase
    .from('workers')
    .select(
      'id, name, first_name, second_name, last_name, mother_last_name, role_id, contract, constraints, specialty_task_id, special_role, is_active, role:roles(id, code, name)',
    )
    .eq('organization_id', orgId)
    .order('code', { foreignTable: 'roles' })
    .order('id')
  if (error) throw error
  const workers = (data ?? []).map((row) => workerFromRow(row as WorkerRow))
  const normalized = normalizeWorkers(workers) ?? workers
  const tasks = await getTasks(orgId)
  return normalized.map((worker) => {
    if (worker.specialtyTaskId) return worker
    const defaultTask = tasks.find((task) => task.allowedRoleCodes.includes(worker.roleCode))
    return {
      ...worker,
      specialtyTaskId: defaultTask?.id ?? null,
    }
  })
}

export async function setWorkers(workers: Worker[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  const roles = await getRoles(orgId)
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]))
  const fallbackRoleId = roles[0]?.id ?? null
  const rows = workers.map((worker) => ({
    ...worker,
    roleId: resolveWorkerRoleId(worker, roleByCode, fallbackRoleId),
  }))
  if (rows.some((worker) => !worker.roleId)) {
    throw new Error('Role id is required for workers')
  }
  await syncTable<Worker, ReturnType<typeof workerToRow>>('workers', orgId, rows, workerToRow)
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
        taskId: taskId ?? null,
        equipmentId: (assignment as Assignment).equipmentId ?? null,
        source: (assignment as Assignment).source ?? 'manual',
      }
    })
    .filter((assignment) => assignment.workerId != null && assignment.shift != null)
}

export async function getPlanning(weekStart: string, organizationId: string): Promise<PlanningRecord | null> {
  const orgId = ensureOrganizationId(organizationId)
  const { data, error } = await supabase
    .from('planning_records')
    .select(
      'week_start, assignments:assignments (id, week_start, worker_id, task_id, equipment_id, shift, source, task:tasks(id, name), equipment:equipments(id, serie))',
    )
    .eq('organization_id', orgId)
    .eq('week_start', weekStart)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const assignments = Array.isArray(data.assignments)
    ? data.assignments.map((row) => assignmentFromRow(row as AssignmentRow))
    : []
  return { weekStart, assignments }
}

export async function setPlanning(weekStart: string, record: PlanningRecord, organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  const { error: upsertRecordError } = await supabase
    .from('planning_records')
    .upsert(
      {
        organization_id: orgId,
        week_start: weekStart,
        columns: {},
        tasks_by_worker_id: {},
        equipment_by_worker_id: {},
        assignments: null,
      },
      { onConflict: 'organization_id,week_start' },
    )
  if (upsertRecordError) throw upsertRecordError
  const assignments = record.assignments.map((assignment) => ({
    ...assignment,
    weekStart,
  }))
  const { data: existing, error: existingError } = await supabase
    .from('assignments')
    .select('worker_id')
    .eq('organization_id', orgId)
    .eq('week_start', weekStart)
  if (existingError) throw existingError
  const existingIds = new Set((existing ?? []).map((row: { worker_id: number }) => String(row.worker_id)))
  const incomingIds = new Set(assignments.map((assignment) => String(assignment.workerId)))
  const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id))
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('assignments')
      .delete()
      .eq('organization_id', orgId)
      .eq('week_start', weekStart)
      .in('worker_id', idsToDelete)
    if (deleteError) throw deleteError
  }
  if (assignments.length > 0) {
    const { error: upsertAssignmentsError } = await supabase
      .from('assignments')
      .upsert(assignments.map((assignment) => assignmentToRow(assignment, orgId)), {
        onConflict: 'organization_id,week_start,worker_id',
      })
    if (upsertAssignmentsError) throw upsertAssignmentsError
  }
}

export async function insertShiftHistory(assignments: Assignment[], organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  if (assignments.length === 0) return
  const { error } = await supabase
    .from('shift_history')
    .insert(assignments.map((assignment) => shiftHistoryToRow(assignment, orgId)))
  if (error) throw error
}

export async function getShiftHistoryByWorker(
  organizationId: string,
  workerId: number,
  limit = 25,
  offset = 0,
): Promise<{ entries: ShiftHistoryEntry[]; hasMore: boolean }> {
  const orgId = ensureOrganizationId(organizationId)
  const rangeEnd = offset + limit
  const { data, error } = await supabase
    .from('shift_history')
    .select(
      'id, week_start, worker_id, task_id, equipment_id, shift, source, created_at, task:tasks(id, name), equipment:equipments(id, serie)',
    )
    .eq('organization_id', orgId)
    .eq('worker_id', workerId)
    .order('week_start', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, rangeEnd)
  if (error) throw error
  const rows = (data ?? []) as ShiftHistoryRow[]
  const hasMore = rows.length > limit
  const trimmed = hasMore ? rows.slice(0, limit) : rows
  return { entries: trimmed.map((row) => shiftHistoryFromRow(row)), hasMore }
}

export async function clearPlanning(weekStart: string, organizationId: string) {
  const orgId = ensureOrganizationId(organizationId)
  await ensureWriteAccess(orgId)
  const { error } = await supabase
    .from('planning_records')
    .delete()
    .eq('organization_id', orgId)
    .eq('week_start', weekStart)
  if (error) throw error
}
