import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  getEquipmentStatuses,
  getEquipmentTypes,
  getEquipmentVariants,
  getRoles,
  getTasks,
  setEquipmentStatuses,
  setEquipmentTypes,
  setEquipmentVariants,
  setRoles,
  setTasks,
} from '../lib/storage'
import type {
  EquipmentStatusOption,
  EquipmentTypeOption,
  EquipmentVariantOption,
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

export function SetupPage() {
  const [roles, setRolesState] = useState<Role[]>([])
  const [tasks, setTasksState] = useState<Task[]>([])
  const [equipmentTypes, setEquipmentTypesState] = useState<EquipmentTypeOption[]>([])
  const [equipmentVariants, setEquipmentVariantsState] = useState<EquipmentVariantOption[]>([])
  const [equipmentStatuses, setEquipmentStatusesState] = useState<EquipmentStatusOption[]>([])
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
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRolesState(getRoles())
    setTasksState(getTasks())
    setEquipmentTypesState(getEquipmentTypes())
    setEquipmentVariantsState(getEquipmentVariants())
    setEquipmentStatusesState(getEquipmentStatuses())
  }, [])

  useEffect(() => {
    if (roles.length > 0) setRoles(roles)
  }, [roles])

  useEffect(() => {
    if (tasks.length > 0) setTasks(tasks)
  }, [tasks])

  useEffect(() => {
    if (equipmentTypes.length > 0) setEquipmentTypes(equipmentTypes)
  }, [equipmentTypes])

  useEffect(() => {
    if (equipmentVariants.length > 0) setEquipmentVariants(equipmentVariants)
  }, [equipmentVariants])

  useEffect(() => {
    if (equipmentStatuses.length > 0) setEquipmentStatuses(equipmentStatuses)
  }, [equipmentStatuses])

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

  function handleExportData() {
    const items = Object.keys(localStorage).reduce<Record<string, string>>((acc, key) => {
      const value = localStorage.getItem(key)
      if (value !== null) acc[key] = value
      return acc
    }, {})
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ops-roster-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const shouldReplace = window.confirm(
      'Al importar se reemplazará todo el contenido actual. ¿Deseas continuar?',
    )
    if (!shouldReplace) return
    const text = await file.text()
    const parsed = JSON.parse(text) as { items?: Record<string, unknown> } | Record<string, unknown>
    const items = 'items' in parsed && parsed.items ? parsed.items : parsed
    if (!items || typeof items !== 'object') return
    localStorage.clear()
    Object.entries(items).forEach(([key, value]) => {
      if (typeof value === 'string') {
        localStorage.setItem(key, value)
        return
      }
      if (value !== null && value !== undefined) {
        localStorage.setItem(key, JSON.stringify(value))
      }
    })
    window.location.reload()
  }

  return (
    <section className="setup-page">
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
            title="Añadir rol"
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
                <button type="submit">{roleEditingId ? 'Guardar cambios' : 'Agregar'}</button>
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
                        title="Editar rol"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteRole(role.id)}
                        aria-label="Borrar rol"
                        title="Borrar rol"
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
            title="Añadir función"
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
                <button type="submit">{taskEditingId ? 'Guardar cambios' : 'Agregar'}</button>
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
                        title="Editar función"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteTask(task.id)}
                        aria-label="Borrar función"
                        title="Borrar función"
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
            title="Añadir tipo de equipo"
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
                <button type="submit">{equipmentTypeEditingId ? 'Guardar cambios' : 'Agregar'}</button>
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
                        title="Editar tipo"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteEquipmentType(type.id)}
                        aria-label="Borrar tipo"
                        title="Borrar tipo"
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
            title="Añadir variante"
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
                <button type="submit">{equipmentVariantEditingId ? 'Guardar cambios' : 'Agregar'}</button>
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
                        title="Editar variante"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteEquipmentVariant(variant.id)}
                        aria-label="Borrar variante"
                        title="Borrar variante"
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
            title="Añadir estado"
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
                <button type="submit">{equipmentStatusEditingId ? 'Guardar cambios' : 'Agregar'}</button>
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
                        title="Editar estado"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handleDeleteEquipmentStatus(status.id)}
                        aria-label="Borrar estado"
                        title="Borrar estado"
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
            <h2>Exportar e importar</h2>
            <p className="subtitle">
              Descarga o carga un archivo con toda la información guardada en este dispositivo.
              Importar reemplazará todo el contenido anterior.
            </p>
          </div>
        </div>
        <div className="button-row">
          <button type="button" onClick={handleExportData}>
            Exportar
          </button>
          <button type="button" onClick={handleImportClick}>
            Importar
          </button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          onChange={handleImportData}
          style={{ display: 'none' }}
        />
      </div>
    </section>
  )
}
