import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  getEquipmentStatuses,
  getEquipmentTypes,
  getEquipmentVariants,
  getOrganizationMembers,
  getRoles,
  getTasks,
  setEquipmentStatuses,
  setEquipmentTypes,
  setEquipmentVariants,
  setRoles,
  setTasks,
  upsertOrganizationMember,
} from '../lib/storage'
import { useOrganization } from '../lib/organizationContext'
import type {
  EquipmentStatusOption,
  EquipmentTypeOption,
  EquipmentVariantOption,
  OrganizationMember,
  OrganizationMemberRole,
  Role,
  Task,
} from '../types'

type RoleFormState = {
  code: string
  name: string
  isActive: boolean
}

type TaskFormState = {
  name: string
  allowedRoleCode: string
  equipmentType: string
  equipmentVariant: string
  isActive: boolean
}

type EquipmentTypeFormState = {
  name: string
  roleCode: string
  isActive: boolean
}

type EquipmentVariantFormState = {
  type: string
  name: string
  isActive: boolean
}

type EquipmentStatusFormState = {
  name: string
  isActive: boolean
}

type MemberFormState = {
  userId: string
  role: OrganizationMemberRole
}

export function SetupPage() {
  const { activeOrganizationId, canWrite, memberRole } = useOrganization()
  const [roles, setRolesState] = useState<Role[]>([])
  const [tasks, setTasksState] = useState<Task[]>([])
  const [equipmentTypes, setEquipmentTypesState] = useState<EquipmentTypeOption[]>([])
  const [equipmentVariants, setEquipmentVariantsState] = useState<EquipmentVariantOption[]>([])
  const [equipmentStatuses, setEquipmentStatusesState] = useState<EquipmentStatusOption[]>([])
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [memberActionError, setMemberActionError] = useState<string | null>(null)
  const [isMemberSaving, setIsMemberSaving] = useState(false)
  const [roleEditingId, setRoleEditingId] = useState<string | null>(null)
  const [taskEditingId, setTaskEditingId] = useState<string | null>(null)
  const [equipmentTypeEditingId, setEquipmentTypeEditingId] = useState<string | null>(null)
  const [equipmentVariantEditingId, setEquipmentVariantEditingId] = useState<string | null>(null)
  const [equipmentStatusEditingId, setEquipmentStatusEditingId] = useState<string | null>(null)
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false)
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isEquipmentTypeFormOpen, setIsEquipmentTypeFormOpen] = useState(false)
  const [isEquipmentVariantFormOpen, setIsEquipmentVariantFormOpen] = useState(false)
  const [isEquipmentStatusFormOpen, setIsEquipmentStatusFormOpen] = useState(false)
  const [roleForm, setRoleForm] = useState<RoleFormState>({ code: '', name: '', isActive: true })
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    name: '',
    allowedRoleCode: '',
    equipmentType: '',
    equipmentVariant: '',
    isActive: true,
  })
  const [equipmentTypeForm, setEquipmentTypeForm] = useState<EquipmentTypeFormState>({
    name: '',
    roleCode: '',
    isActive: true,
  })
  const [equipmentVariantForm, setEquipmentVariantForm] = useState<EquipmentVariantFormState>({
    type: '',
    name: '',
    isActive: true,
  })
  const [equipmentStatusForm, setEquipmentStatusForm] = useState<EquipmentStatusFormState>({
    name: '',
    isActive: true,
  })
  const [memberForm, setMemberForm] = useState<MemberFormState>({ userId: '', role: 'viewer' })

  useEffect(() => {
    if (!activeOrganizationId) return
    let isMounted = true
    const loadData = async () => {
      const [rolesData, tasksData, typesData, variantsData, statusesData] = await Promise.all([
        getRoles(activeOrganizationId),
        getTasks(activeOrganizationId),
        getEquipmentTypes(activeOrganizationId),
        getEquipmentVariants(activeOrganizationId),
        getEquipmentStatuses(activeOrganizationId),
      ])
      if (!isMounted) return
      setRolesState(rolesData)
      setTasksState(tasksData)
      setEquipmentTypesState(typesData)
      setEquipmentVariantsState(variantsData)
      setEquipmentStatusesState(statusesData)
    }
    void loadData()
    return () => {
      isMounted = false
    }
  }, [activeOrganizationId])

  useEffect(() => {
    if (roles.length > 0 && activeOrganizationId && canWrite) {
      void setRoles(roles, activeOrganizationId)
    }
  }, [roles, activeOrganizationId, canWrite])

  useEffect(() => {
    if (tasks.length > 0 && activeOrganizationId && canWrite) {
      void setTasks(tasks, activeOrganizationId)
    }
  }, [tasks, activeOrganizationId, canWrite])

  useEffect(() => {
    if (equipmentTypes.length > 0 && activeOrganizationId && canWrite) {
      void setEquipmentTypes(equipmentTypes, activeOrganizationId)
    }
  }, [equipmentTypes, activeOrganizationId, canWrite])

  useEffect(() => {
    if (equipmentVariants.length > 0 && activeOrganizationId && canWrite) {
      void setEquipmentVariants(equipmentVariants, activeOrganizationId)
    }
  }, [equipmentVariants, activeOrganizationId, canWrite])

  useEffect(() => {
    if (equipmentStatuses.length > 0 && activeOrganizationId && canWrite) {
      void setEquipmentStatuses(equipmentStatuses, activeOrganizationId)
    }
  }, [equipmentStatuses, activeOrganizationId, canWrite])

  useEffect(() => {
    void refreshMembers()
  }, [refreshMembers])

  useEffect(() => {
    if (roles.length === 0 || equipmentTypes.length === 0) return
    const defaultRole = roles[0]?.code ?? ''
    const hasMissingRole = equipmentTypes.some((type) => !type.roleCode)
    if (!hasMissingRole) return
    setEquipmentTypesState((prev) =>
      prev.map((type) => (type.roleCode ? type : { ...type, roleCode: defaultRole })),
    )
  }, [roles, equipmentTypes])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const roleA = a.allowedRoleCodes.join(', ').trim()
      const roleB = b.allowedRoleCodes.join(', ').trim()
      const roleCompare = roleA.localeCompare(roleB)
      if (roleCompare !== 0) return roleCompare
      return a.name.localeCompare(b.name)
    })
  }, [tasks])

  const equipmentVariantsByType = useMemo(() => {
    const map = new Map<string, EquipmentVariantOption[]>()
    equipmentVariants.forEach((variant) => {
      const list = map.get(variant.type) ?? []
      list.push(variant)
      map.set(variant.type, list)
    })
    return map
  }, [equipmentVariants])

  const refreshMembers = useCallback(async () => {
    if (!activeOrganizationId) return
    setMembersLoading(true)
    setMembersError(null)
    try {
      const data = await getOrganizationMembers(activeOrganizationId)
      setMembers(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los miembros.'
      setMembersError(message)
    } finally {
      setMembersLoading(false)
    }
  }, [activeOrganizationId])

  function normalizeVariant(type: string, variant: string) {
    if (!type) return ''
    const availableVariants = equipmentVariantsByType.get(type) ?? []
    return (
      availableVariants.find((option) => option.name === variant)?.name ??
      availableVariants[0]?.name ??
      ''
    )
  }

  function resetRoleForm() {
    setRoleEditingId(null)
    setRoleForm({ code: '', name: '', isActive: true })
    setIsRoleFormOpen(false)
  }

  function resetTaskForm() {
    setTaskEditingId(null)
    setTaskForm({
      name: '',
      allowedRoleCode: '',
      equipmentType: '',
      equipmentVariant: '',
      isActive: true,
    })
    setIsTaskFormOpen(false)
  }

  function resetEquipmentTypeForm() {
    setEquipmentTypeEditingId(null)
    setEquipmentTypeForm({
      name: '',
      roleCode: roles[0]?.code ?? '',
      isActive: true,
    })
    setIsEquipmentTypeFormOpen(false)
  }

  function resetEquipmentVariantForm() {
    setEquipmentVariantEditingId(null)
    setEquipmentVariantForm({
      type: equipmentTypes[0]?.name ?? '',
      name: '',
      isActive: true,
    })
    setIsEquipmentVariantFormOpen(false)
  }

  function resetEquipmentStatusForm() {
    setEquipmentStatusEditingId(null)
    setEquipmentStatusForm({
      name: '',
      isActive: true,
    })
    setIsEquipmentStatusFormOpen(false)
  }

  async function handleMemberSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeOrganizationId || !canWrite) return
    setIsMemberSaving(true)
    setMemberActionError(null)
    try {
      await upsertOrganizationMember(activeOrganizationId, memberForm.userId, memberForm.role)
      setMemberForm({ userId: '', role: 'viewer' })
      await refreshMembers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el miembro.'
      setMemberActionError(message)
    } finally {
      setIsMemberSaving(false)
    }
  }

  async function handleMemberRoleChange(userId: string, role: OrganizationMemberRole) {
    if (!activeOrganizationId || !canWrite) return
    setIsMemberSaving(true)
    setMemberActionError(null)
    try {
      await upsertOrganizationMember(activeOrganizationId, userId, role)
      await refreshMembers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el rol.'
      setMemberActionError(message)
    } finally {
      setIsMemberSaving(false)
    }
  }

  function handleOpenNewRole() {
    setRoleEditingId(null)
    setRoleForm({ code: '', name: '', isActive: true })
    setIsRoleFormOpen(true)
  }

  function handleOpenNewTask() {
    setTaskEditingId(null)
    setTaskForm({
      name: '',
      allowedRoleCode: '',
      equipmentType: '',
      equipmentVariant: '',
      isActive: true,
    })
    setIsTaskFormOpen(true)
  }

  function handleOpenNewEquipmentType() {
    setEquipmentTypeEditingId(null)
    setEquipmentTypeForm({ name: '', roleCode: roles[0]?.code ?? '', isActive: true })
    setIsEquipmentTypeFormOpen(true)
  }

  function handleOpenNewEquipmentVariant() {
    setEquipmentVariantEditingId(null)
    setEquipmentVariantForm({
      type: equipmentTypes[0]?.name ?? '',
      name: '',
      isActive: true,
    })
    setIsEquipmentVariantFormOpen(true)
  }

  function handleOpenNewEquipmentStatus() {
    setEquipmentStatusEditingId(null)
    setEquipmentStatusForm({ name: '', isActive: true })
    setIsEquipmentStatusFormOpen(true)
  }

  function handleEditRole(role: Role) {
    setRoleEditingId(role.id)
    setRoleForm({ code: role.code, name: role.name, isActive: role.isActive })
    setIsRoleFormOpen(true)
  }

  function handleEditTask(task: Task) {
    setTaskEditingId(task.id)
    setTaskForm({
      name: task.name,
      allowedRoleCode: task.allowedRoleCodes[0] ?? '',
      equipmentType: task.equipmentType ?? '',
      equipmentVariant: task.equipmentVariant ?? '',
      isActive: task.isActive,
    })
    setIsTaskFormOpen(true)
  }

  function handleEditEquipmentType(type: EquipmentTypeOption) {
    setEquipmentTypeEditingId(type.id)
    setEquipmentTypeForm({ name: type.name, roleCode: type.roleCode, isActive: type.isActive })
    setIsEquipmentTypeFormOpen(true)
  }

  function handleEditEquipmentVariant(variant: EquipmentVariantOption) {
    setEquipmentVariantEditingId(variant.id)
    setEquipmentVariantForm({ type: variant.type, name: variant.name, isActive: variant.isActive })
    setIsEquipmentVariantFormOpen(true)
  }

  function handleEditEquipmentStatus(status: EquipmentStatusOption) {
    setEquipmentStatusEditingId(status.id)
    setEquipmentStatusForm({ name: status.name, isActive: status.isActive })
    setIsEquipmentStatusFormOpen(true)
  }

  function handleRoleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedCode = roleForm.code.trim()
    const trimmedName = roleForm.name.trim()
    if (!trimmedCode || !trimmedName) return
    const normalizedCode = trimmedCode.toUpperCase()
    if (roleEditingId) {
      setRolesState((prev) =>
        prev.map((role) =>
          role.id === roleEditingId
            ? { ...role, code: normalizedCode, name: trimmedName, isActive: roleForm.isActive }
            : role,
        ),
      )
    } else {
      const nextRole: Role = {
        id: `role-${Date.now()}`,
        code: normalizedCode,
        name: trimmedName,
        isActive: roleForm.isActive,
        countsForBalance: true,
      }
      setRolesState((prev) => [...prev, nextRole])
    }
    resetRoleForm()
  }

  function handleTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = taskForm.name.trim()
    if (!trimmedName) return
    const normalizedVariant = normalizeVariant(taskForm.equipmentType, taskForm.equipmentVariant)
    const allowedRoleCodes = taskForm.allowedRoleCode ? [taskForm.allowedRoleCode] : []
    if (taskEditingId) {
      setTasksState((prev) =>
        prev.map((task) =>
          task.id === taskEditingId
            ? {
                ...task,
                name: trimmedName,
                allowedRoleCodes,
                equipmentType: taskForm.equipmentType || null,
                equipmentVariant: normalizedVariant || null,
                isActive: taskForm.isActive,
              }
            : task,
        ),
      )
    } else {
      const nextTask: Task = {
        id: `task-${Date.now()}`,
        name: trimmedName,
        allowedRoleCodes,
        isActive: taskForm.isActive,
        equipmentType: taskForm.equipmentType || null,
        equipmentVariant: normalizedVariant || null,
      }
      setTasksState((prev) => [...prev, nextTask])
    }
    resetTaskForm()
  }

  function handleEquipmentTypeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = equipmentTypeForm.name.trim()
    if (!trimmedName) return
    const roleCode = equipmentTypeForm.roleCode || roles[0]?.code || ''
    if (equipmentTypeEditingId) {
      setEquipmentTypesState((prev) =>
        prev.map((type) =>
          type.id === equipmentTypeEditingId
            ? { ...type, name: trimmedName, roleCode, isActive: equipmentTypeForm.isActive }
            : type,
        ),
      )
    } else {
      const nextType: EquipmentTypeOption = {
        id: `equipment-type-${Date.now()}`,
        name: trimmedName,
        roleCode,
        isActive: equipmentTypeForm.isActive,
      }
      setEquipmentTypesState((prev) => [...prev, nextType])
    }
    resetEquipmentTypeForm()
  }

  function handleEquipmentVariantSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = equipmentVariantForm.name.trim()
    if (!trimmedName || !equipmentVariantForm.type.trim()) return
    if (equipmentVariantEditingId) {
      setEquipmentVariantsState((prev) =>
        prev.map((variant) =>
          variant.id === equipmentVariantEditingId
            ? {
                ...variant,
                name: trimmedName,
                type: equipmentVariantForm.type,
                isActive: equipmentVariantForm.isActive,
              }
            : variant,
        ),
      )
    } else {
      const nextVariant: EquipmentVariantOption = {
        id: `equipment-variant-${Date.now()}`,
        name: trimmedName,
        type: equipmentVariantForm.type,
        isActive: equipmentVariantForm.isActive,
      }
      setEquipmentVariantsState((prev) => [...prev, nextVariant])
    }
    resetEquipmentVariantForm()
  }

  function handleEquipmentStatusSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = equipmentStatusForm.name.trim()
    if (!trimmedName) return
    if (equipmentStatusEditingId) {
      setEquipmentStatusesState((prev) =>
        prev.map((status) =>
          status.id === equipmentStatusEditingId
            ? { ...status, name: trimmedName, isActive: equipmentStatusForm.isActive }
            : status,
        ),
      )
    } else {
      const nextStatus: EquipmentStatusOption = {
        id: `equipment-status-${Date.now()}`,
        name: trimmedName,
        isActive: equipmentStatusForm.isActive,
      }
      setEquipmentStatusesState((prev) => [...prev, nextStatus])
    }
    resetEquipmentStatusForm()
  }

  function handleDeleteRole(id: string) {
    setRolesState((prev) => prev.filter((role) => role.id !== id))
  }

  function handleDeleteTask(id: string) {
    setTasksState((prev) => prev.filter((task) => task.id !== id))
  }

  function handleDeleteEquipmentType(id: string) {
    setEquipmentTypesState((prev) => prev.filter((type) => type.id !== id))
  }

  function handleDeleteEquipmentVariant(id: string) {
    setEquipmentVariantsState((prev) => prev.filter((variant) => variant.id !== id))
  }

  function handleDeleteEquipmentStatus(id: string) {
    setEquipmentStatusesState((prev) => prev.filter((status) => status.id !== id))
  }

  const roleLabels: Record<OrganizationMemberRole, string> = {
    viewer: 'Viewer',
    editor: 'Editor',
    owner: 'Owner',
  }

  return (
    <section className="setup-page">
      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2>Miembros</h2>
            <p className="subtitle">
              Administra los roles de acceso. Tu rol actual:{' '}
              {memberRole ? roleLabels[memberRole] : 'Sin asignar'}.
            </p>
          </div>
        </div>
        {membersLoading ? <p className="helper-text">Cargando miembros...</p> : null}
        {membersError ? <p className="helper-text">{membersError}</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={3}>Sin miembros aún.</td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.userId}>
                    <td>{member.userId}</td>
                    <td>
                      {canWrite ? (
                        <select
                          value={member.role}
                          onChange={(event) =>
                            handleMemberRoleChange(member.userId, event.target.value as OrganizationMemberRole)
                          }
                          disabled={isMemberSaving}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        roleLabels[member.role]
                      )}
                    </td>
                    <td>{new Date(member.createdAt).toLocaleDateString('es-AR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <form className="form-card" onSubmit={handleMemberSubmit}>
          <div className="form-header">
            <div>
              <h3>Invitar miembro</h3>
              <p className="subtitle">Ingresa el user_id y asigna un rol.</p>
            </div>
            <div className="button-row">
              <button type="submit" disabled={!canWrite || isMemberSaving}>
                {isMemberSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              User ID
              <input
                value={memberForm.userId}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, userId: event.target.value }))}
                placeholder="UUID del usuario"
                disabled={!canWrite || isMemberSaving}
              />
            </label>
            <label className="field">
              Rol
              <select
                value={memberForm.role}
                onChange={(event) =>
                  setMemberForm((prev) => ({ ...prev, role: event.target.value as OrganizationMemberRole }))
                }
                disabled={!canWrite || isMemberSaving}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            {!canWrite ? (
              <p className="helper-text">No tienes permisos para administrar miembros.</p>
            ) : null}
            {memberActionError ? <p className="helper-text">{memberActionError}</p> : null}
          </div>
        </form>
      </div>
      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2>Roles</h2>
            <p className="subtitle">Define los cargos disponibles y su estado.</p>
          </div>
          <button
            type="button"
            className="add-worker-button"
            onClick={handleOpenNewRole}
            aria-label="Añadir rol"
            disabled={!canWrite}
          >
            +
          </button>
        </div>
        {isRoleFormOpen ? (
          <form className="form-card" onSubmit={handleRoleSubmit}>
            <div className="form-header">
              <div>
                <h3>{roleEditingId ? 'Editar rol' : 'Nuevo rol'}</h3>
                <p className="subtitle">Gestiona el código y nombre del rol.</p>
              </div>
              <div className="button-row">
                <button type="submit" disabled={!canWrite}>
                  {roleEditingId ? 'Guardar cambios' : 'Agregar'}
                </button>
                <button type="button" onClick={resetRoleForm}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                Código
                <input
                  value={roleForm.code}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, code: event.target.value }))}
                  placeholder="Código"
                  required
                />
              </label>
              <label className="field">
                Nombre
                <input
                  value={roleForm.name}
                  onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nombre"
                  required
                />
              </label>
              <label className="field">
                Nombre
                <select
                  value={roleForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setRoleForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
          </form>
        ) : null}
        <div className="table-wrap">
          <table className="setup-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th className="cell-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.code}</td>
                  <td>{role.name}</td>
                  <td>{role.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="cell-actions">
                    <div className="button-row">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEditRole(role)}
                        aria-label="Editar rol"
                        disabled={!canWrite}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteRole(role.id)}
                        aria-label="Borrar rol"
                        disabled={!canWrite}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2>Funciones</h2>
            <p className="subtitle">Configura las tareas disponibles y su relación con roles y equipos.</p>
          </div>
          <button
            type="button"
            className="add-worker-button"
            onClick={handleOpenNewTask}
            aria-label="Añadir función"
            disabled={!canWrite}
          >
            +
          </button>
        </div>
        {isTaskFormOpen ? (
          <form className="form-card" onSubmit={handleTaskSubmit}>
            <div className="form-header">
              <div>
                <h3>{taskEditingId ? 'Editar función' : 'Nueva función'}</h3>
                <p className="subtitle">Selecciona rol y equipo según corresponda.</p>
              </div>
              <div className="button-row">
                <button type="submit" disabled={!canWrite}>
                  {taskEditingId ? 'Guardar cambios' : 'Agregar'}
                </button>
                <button type="button" onClick={resetTaskForm}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                Rol
                <select
                  value={taskForm.allowedRoleCode}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, allowedRoleCode: event.target.value }))}
                >
                  <option value="">Sin rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.code}>
                      {role.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Nombre
                <input
                  value={taskForm.name}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Nombre de la función"
                  required
                />
              </label>
              <label className="field">
                Tipo de equipo
                <select
                  value={taskForm.equipmentType}
                  onChange={(event) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      equipmentType: event.target.value,
                      equipmentVariant: normalizeVariant(event.target.value, ''),
                    }))
                  }
                >
                  <option value="">Sin equipo</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Variante
                <select
                  value={taskForm.equipmentVariant}
                  onChange={(event) => setTaskForm((prev) => ({ ...prev, equipmentVariant: event.target.value }))}
                  disabled={!taskForm.equipmentType}
                >
                  <option value="">Sin variante</option>
                  {(equipmentVariantsByType.get(taskForm.equipmentType) ?? []).map((variant) => (
                    <option key={variant.id} value={variant.name}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Estado
                <select
                  value={taskForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
          </form>
        ) : null}
        <div className="table-wrap">
          <table className="setup-table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Nombre</th>
                <th>Tipo equipo</th>
                <th>Variante</th>
                <th>Estado</th>
                <th className="cell-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.allowedRoleCodes[0] ?? 'Sin rol'}</td>
                  <td>{task.name}</td>
                  <td>{task.equipmentType ?? 'Sin equipo'}</td>
                  <td>{task.equipmentVariant ?? 'Sin variante'}</td>
                  <td>{task.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="cell-actions">
                    <div className="button-row">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEditTask(task)}
                        aria-label="Editar función"
                        disabled={!canWrite}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label="Borrar función"
                        disabled={!canWrite}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2>Tipos de equipo</h2>
            <p className="subtitle">Define los tipos disponibles y el rol asociado.</p>
          </div>
          <button
            type="button"
            className="add-worker-button"
            onClick={handleOpenNewEquipmentType}
            aria-label="Añadir tipo de equipo"
            disabled={!canWrite}
          >
            +
          </button>
        </div>
        {isEquipmentTypeFormOpen ? (
          <form className="form-card" onSubmit={handleEquipmentTypeSubmit}>
            <div className="form-header">
              <div>
                <h3>{equipmentTypeEditingId ? 'Editar tipo' : 'Nuevo tipo'}</h3>
                <p className="subtitle">Asigna un rol principal al tipo de equipo.</p>
              </div>
              <div className="button-row">
                <button type="submit" disabled={!canWrite}>
                  {equipmentTypeEditingId ? 'Guardar cambios' : 'Agregar'}
                </button>
                <button type="button" onClick={resetEquipmentTypeForm}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                Rol
                <select
                  value={equipmentTypeForm.roleCode}
                  onChange={(event) =>
                    setEquipmentTypeForm((prev) => ({ ...prev, roleCode: event.target.value }))
                  }
                >
                  <option value="">Sin rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.code}>
                      {role.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Tipo
                <input
                  value={equipmentTypeForm.name}
                  onChange={(event) => setEquipmentTypeForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Tipo"
                  required
                />
              </label>
              <label className="field">
                Estado
                <select
                  value={equipmentTypeForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEquipmentTypeForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
          </form>
        ) : null}
        <div className="table-wrap">
          <table className="setup-table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th className="cell-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipmentTypes.map((type) => (
                <tr key={type.id}>
                  <td>{type.roleCode || 'Sin rol'}</td>
                  <td>{type.name}</td>
                  <td>{type.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="cell-actions">
                    <div className="button-row">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEditEquipmentType(type)}
                        aria-label="Editar tipo"
                        disabled={!canWrite}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteEquipmentType(type.id)}
                        aria-label="Borrar tipo"
                        disabled={!canWrite}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2>Variantes de equipo</h2>
            <p className="subtitle">Configura las variantes por tipo.</p>
          </div>
          <button
            type="button"
            className="add-worker-button"
            onClick={handleOpenNewEquipmentVariant}
            aria-label="Añadir variante"
            disabled={!canWrite}
          >
            +
          </button>
        </div>
        {isEquipmentVariantFormOpen ? (
          <form className="form-card" onSubmit={handleEquipmentVariantSubmit}>
            <div className="form-header">
              <div>
                <h3>{equipmentVariantEditingId ? 'Editar variante' : 'Nueva variante'}</h3>
                <p className="subtitle">Relaciona la variante con un tipo específico.</p>
              </div>
              <div className="button-row">
                <button type="submit" disabled={!canWrite}>
                  {equipmentVariantEditingId ? 'Guardar cambios' : 'Agregar'}
                </button>
                <button type="button" onClick={resetEquipmentVariantForm}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                Tipo
                <select
                  value={equipmentVariantForm.type}
                  onChange={(event) =>
                    setEquipmentVariantForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                >
                  <option value="">Selecciona tipo</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Variante
                <input
                  value={equipmentVariantForm.name}
                  onChange={(event) =>
                    setEquipmentVariantForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Variante"
                  required
                />
              </label>
              <label className="field">
                Estado
                <select
                  value={equipmentVariantForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEquipmentVariantForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
          </form>
        ) : null}
        <div className="table-wrap">
          <table className="setup-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Variante</th>
                <th>Estado</th>
                <th className="cell-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipmentVariants.map((variant) => (
                <tr key={variant.id}>
                  <td>{variant.type}</td>
                  <td>{variant.name}</td>
                  <td>{variant.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="cell-actions">
                    <div className="button-row">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEditEquipmentVariant(variant)}
                        aria-label="Editar variante"
                        disabled={!canWrite}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteEquipmentVariant(variant.id)}
                        aria-label="Borrar variante"
                        disabled={!canWrite}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="setup-section">
        <div className="setup-section-header">
          <div>
            <h2>Estados de equipo</h2>
            <p className="subtitle">Define los estados posibles para los equipos.</p>
          </div>
          <button
            type="button"
            className="add-worker-button"
            onClick={handleOpenNewEquipmentStatus}
            aria-label="Añadir estado"
            disabled={!canWrite}
          >
            +
          </button>
        </div>
        {isEquipmentStatusFormOpen ? (
          <form className="form-card" onSubmit={handleEquipmentStatusSubmit}>
            <div className="form-header">
              <div>
                <h3>{equipmentStatusEditingId ? 'Editar estado' : 'Nuevo estado'}</h3>
                <p className="subtitle">Controla la disponibilidad de los equipos.</p>
              </div>
              <div className="button-row">
                <button type="submit" disabled={!canWrite}>
                  {equipmentStatusEditingId ? 'Guardar cambios' : 'Agregar'}
                </button>
                <button type="button" onClick={resetEquipmentStatusForm}>
                  Cancelar
                </button>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                Estado
                <input
                  value={equipmentStatusForm.name}
                  onChange={(event) =>
                    setEquipmentStatusForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Estado"
                  required
                />
              </label>
              <label className="field">
                Estado
                <select
                  value={equipmentStatusForm.isActive ? 'active' : 'inactive'}
                  onChange={(event) =>
                    setEquipmentStatusForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
          </form>
        ) : null}
        <div className="table-wrap">
          <table className="setup-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th className="cell-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipmentStatuses.map((status) => (
                <tr key={status.id}>
                  <td>{status.name}</td>
                  <td>{status.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="cell-actions">
                    <div className="button-row">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleEditEquipmentStatus(status)}
                        aria-label="Editar estado"
                        disabled={!canWrite}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteEquipmentStatus(status.id)}
                        aria-label="Borrar estado"
                        disabled={!canWrite}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
