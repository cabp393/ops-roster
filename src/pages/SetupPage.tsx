import { useEffect, useMemo, useState } from 'react'
import {
  getEquipmentRoles,
  getEquipmentStatuses,
  getEquipmentTypes,
  getEquipmentVariants,
  getRoles,
  getTasks,
  setEquipmentRoles,
  setEquipmentStatuses,
  setEquipmentTypes,
  setEquipmentVariants,
  setRoles,
  setTasks,
} from '../lib/storage'
import type {
  EquipmentRoleOption,
  EquipmentStatusOption,
  EquipmentTypeOption,
  EquipmentVariantOption,
  Role,
  Task,
} from '../types'

function parseRoleCodes(input: string) {
  return input
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
}

export function SetupPage() {
  const [roles, setRolesState] = useState<Role[]>([])
  const [tasks, setTasksState] = useState<Task[]>([])
  const [equipmentRoles, setEquipmentRolesState] = useState<EquipmentRoleOption[]>([])
  const [equipmentTypes, setEquipmentTypesState] = useState<EquipmentTypeOption[]>([])
  const [equipmentVariants, setEquipmentVariantsState] = useState<EquipmentVariantOption[]>([])
  const [equipmentStatuses, setEquipmentStatusesState] = useState<EquipmentStatusOption[]>([])
  const [newRole, setNewRole] = useState({ code: '', name: '' })
  const [newTask, setNewTask] = useState({
    name: '',
    allowedRoleCodes: '',
    equipmentType: '',
    equipmentVariant: '',
  })
  const [newEquipmentRole, setNewEquipmentRole] = useState({ code: '', name: '' })
  const [newEquipmentType, setNewEquipmentType] = useState({ name: '' })
  const [newEquipmentVariant, setNewEquipmentVariant] = useState({ type: '', name: '' })
  const [newEquipmentStatus, setNewEquipmentStatus] = useState({ name: '' })

  useEffect(() => {
    setRolesState(getRoles())
    setTasksState(getTasks())
    setEquipmentRolesState(getEquipmentRoles())
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
    if (equipmentRoles.length > 0) setEquipmentRoles(equipmentRoles)
  }, [equipmentRoles])

  useEffect(() => {
    if (equipmentTypes.length > 0) setEquipmentTypes(equipmentTypes)
  }, [equipmentTypes])

  useEffect(() => {
    if (equipmentVariants.length > 0) setEquipmentVariants(equipmentVariants)
  }, [equipmentVariants])

  useEffect(() => {
    if (equipmentStatuses.length > 0) setEquipmentStatuses(equipmentStatuses)
  }, [equipmentStatuses])

  const activeRoleCodes = useMemo(() => roles.map((role) => role.code).join(', '), [roles])
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const roleA = a.allowedRoleCodes.join(', ').trim()
      const roleB = b.allowedRoleCodes.join(', ').trim()
      const roleCompare = roleA.localeCompare(roleB)
      if (roleCompare !== 0) return roleCompare
      return a.name.localeCompare(b.name)
    })
  }, [tasks])

  function updateRole(id: string, patch: Partial<Role>) {
    setRolesState((prev) => prev.map((role) => (role.id === id ? { ...role, ...patch } : role)))
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasksState((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }

  function updateEquipmentRole(id: string, patch: Partial<EquipmentRoleOption>) {
    setEquipmentRolesState((prev) =>
      prev.map((role) => (role.id === id ? { ...role, ...patch } : role)),
    )
  }

  function updateEquipmentType(id: string, patch: Partial<EquipmentTypeOption>) {
    setEquipmentTypesState((prev) =>
      prev.map((type) => (type.id === id ? { ...type, ...patch } : type)),
    )
  }

  function updateEquipmentVariant(id: string, patch: Partial<EquipmentVariantOption>) {
    setEquipmentVariantsState((prev) =>
      prev.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)),
    )
  }

  function updateEquipmentStatus(id: string, patch: Partial<EquipmentStatusOption>) {
    setEquipmentStatusesState((prev) =>
      prev.map((status) => (status.id === id ? { ...status, ...patch } : status)),
    )
  }

  function handleAddRole() {
    if (!newRole.code.trim() || !newRole.name.trim()) return
    const nextRole: Role = {
      id: `role-${Date.now()}`,
      code: newRole.code.trim().toUpperCase(),
      name: newRole.name.trim(),
      isActive: true,
      countsForBalance: true,
    }
    setRolesState((prev) => [...prev, nextRole])
    setNewRole({ code: '', name: '' })
  }

  function handleAddTask() {
    if (!newTask.name.trim()) return
    const nextTask: Task = {
      id: `task-${Date.now()}`,
      name: newTask.name.trim(),
      allowedRoleCodes: parseRoleCodes(newTask.allowedRoleCodes),
      isActive: true,
      equipmentType: newTask.equipmentType || null,
      equipmentVariant: newTask.equipmentVariant || null,
    }
    setTasksState((prev) => [...prev, nextTask])
    setNewTask({ name: '', allowedRoleCodes: '', equipmentType: '', equipmentVariant: '' })
  }

  function handleAddEquipmentRole() {
    if (!newEquipmentRole.code.trim() || !newEquipmentRole.name.trim()) return
    const nextRole: EquipmentRoleOption = {
      id: `equipment-role-${Date.now()}`,
      code: newEquipmentRole.code.trim().toUpperCase(),
      name: newEquipmentRole.name.trim(),
      isActive: true,
    }
    setEquipmentRolesState((prev) => [...prev, nextRole])
    setNewEquipmentRole({ code: '', name: '' })
  }

  function handleAddEquipmentType() {
    if (!newEquipmentType.name.trim()) return
    const nextType: EquipmentTypeOption = {
      id: `equipment-type-${Date.now()}`,
      name: newEquipmentType.name.trim(),
      isActive: true,
    }
    setEquipmentTypesState((prev) => [...prev, nextType])
    setNewEquipmentType({ name: '' })
  }

  function handleAddEquipmentVariant() {
    if (!newEquipmentVariant.name.trim() || !newEquipmentVariant.type.trim()) return
    const nextVariant: EquipmentVariantOption = {
      id: `equipment-variant-${Date.now()}`,
      name: newEquipmentVariant.name.trim(),
      type: newEquipmentVariant.type,
      isActive: true,
    }
    setEquipmentVariantsState((prev) => [...prev, nextVariant])
    setNewEquipmentVariant({ type: '', name: '' })
  }

  function handleAddEquipmentStatus() {
    if (!newEquipmentStatus.name.trim()) return
    const nextStatus: EquipmentStatusOption = {
      id: `equipment-status-${Date.now()}`,
      name: newEquipmentStatus.name.trim(),
      isActive: true,
    }
    setEquipmentStatusesState((prev) => [...prev, nextStatus])
    setNewEquipmentStatus({ name: '' })
  }

  const equipmentVariantsByType = useMemo(() => {
    const map = new Map<string, EquipmentVariantOption[]>()
    equipmentVariants.forEach((variant) => {
      const list = map.get(variant.type) ?? []
      list.push(variant)
      map.set(variant.type, list)
    })
    return map
  }, [equipmentVariants])

  return (
    <section>
      <div className="summary">
        <strong>Roles manager</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <input
                    value={role.code}
                    onChange={(event) => updateRole(role.id, { code: event.target.value.toUpperCase() })}
                  />
                </td>
                <td>
                  <input
                    value={role.name}
                    onChange={(event) => updateRole(role.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={role.isActive}
                    onChange={(event) => updateRole(role.id, { isActive: event.target.checked })}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="Code"
                  value={newRole.code}
                  onChange={(event) => setNewRole((prev) => ({ ...prev, code: event.target.value }))}
                />
              </td>
              <td>
                <input
                  placeholder="Name"
                  value={newRole.name}
                  onChange={(event) => setNewRole((prev) => ({ ...prev, name: event.target.value }))}
                />
              </td>
              <td>
                <button type="button" onClick={handleAddRole}>
                  Add role
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: '1.5rem' }}>
        <strong>Tasks manager</strong>
      </div>
      <p className="summary">Active role codes: {activeRoleCodes || 'None'}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Allowed roles (comma)</th>
              <th>Name</th>
              <th>Tipo equipo</th>
              <th>Variante</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <input
                    value={task.allowedRoleCodes.join(', ')}
                    onChange={(event) =>
                      updateTask(task.id, { allowedRoleCodes: parseRoleCodes(event.target.value) })
                    }
                  />
                </td>
                <td>
                  <input
                    value={task.name}
                    onChange={(event) => updateTask(task.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={task.equipmentType ?? ''}
                    onChange={(event) =>
                      updateTask(task.id, {
                        equipmentType: event.target.value || null,
                        equipmentVariant: null,
                      })
                    }
                  >
                    <option value="">Sin equipo</option>
                    {equipmentTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={task.equipmentVariant ?? ''}
                    onChange={(event) =>
                      updateTask(task.id, { equipmentVariant: event.target.value || null })
                    }
                    disabled={!task.equipmentType}
                  >
                    <option value="">Sin variante</option>
                    {(equipmentVariantsByType.get(task.equipmentType ?? '') ?? []).map((variant) => (
                      <option key={variant.id} value={variant.name}>
                        {variant.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={task.isActive}
                    onChange={(event) => updateTask(task.id, { isActive: event.target.checked })}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="OG, AL"
                  value={newTask.allowedRoleCodes}
                  onChange={(event) =>
                    setNewTask((prev) => ({ ...prev, allowedRoleCodes: event.target.value }))
                  }
                />
              </td>
              <td>
                <input
                  placeholder="Task name"
                  value={newTask.name}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, name: event.target.value }))}
                />
              </td>
              <td>
                <select
                  value={newTask.equipmentType}
                  onChange={(event) =>
                    setNewTask((prev) => ({
                      ...prev,
                      equipmentType: event.target.value,
                      equipmentVariant: '',
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
              </td>
              <td>
                <select
                  value={newTask.equipmentVariant}
                  onChange={(event) =>
                    setNewTask((prev) => ({ ...prev, equipmentVariant: event.target.value }))
                  }
                  disabled={!newTask.equipmentType}
                >
                  <option value="">Sin variante</option>
                  {(equipmentVariantsByType.get(newTask.equipmentType) ?? []).map((variant) => (
                    <option key={variant.id} value={variant.name}>
                      {variant.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <button type="button" onClick={handleAddTask}>
                  Add task
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: '1.5rem' }}>
        <strong>Equipos - Roles</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {equipmentRoles.map((role) => (
              <tr key={role.id}>
                <td>
                  <input
                    value={role.code}
                    onChange={(event) =>
                      updateEquipmentRole(role.id, { code: event.target.value.toUpperCase() })
                    }
                  />
                </td>
                <td>
                  <input
                    value={role.name}
                    onChange={(event) => updateEquipmentRole(role.id, { name: event.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={role.isActive}
                    onChange={(event) =>
                      updateEquipmentRole(role.id, { isActive: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="Code"
                  value={newEquipmentRole.code}
                  onChange={(event) =>
                    setNewEquipmentRole((prev) => ({ ...prev, code: event.target.value }))
                  }
                />
              </td>
              <td>
                <input
                  placeholder="Name"
                  value={newEquipmentRole.name}
                  onChange={(event) =>
                    setNewEquipmentRole((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </td>
              <td>
                <button type="button" onClick={handleAddEquipmentRole}>
                  Add role
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: '1.5rem' }}>
        <strong>Equipos - Tipos</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {equipmentTypes.map((type) => (
              <tr key={type.id}>
                <td>
                  <input
                    value={type.name}
                    onChange={(event) =>
                      updateEquipmentType(type.id, { name: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={type.isActive}
                    onChange={(event) =>
                      updateEquipmentType(type.id, { isActive: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="Tipo"
                  value={newEquipmentType.name}
                  onChange={(event) =>
                    setNewEquipmentType((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </td>
              <td>
                <button type="button" onClick={handleAddEquipmentType}>
                  Add tipo
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: '1.5rem' }}>
        <strong>Equipos - Variantes</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Variante</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {equipmentVariants.map((variant) => (
              <tr key={variant.id}>
                <td>
                  <select
                    value={variant.type}
                    onChange={(event) =>
                      updateEquipmentVariant(variant.id, { type: event.target.value })
                    }
                  >
                    {equipmentTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={variant.name}
                    onChange={(event) =>
                      updateEquipmentVariant(variant.id, { name: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(event) =>
                      updateEquipmentVariant(variant.id, { isActive: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <select
                  value={newEquipmentVariant.type}
                  onChange={(event) =>
                    setNewEquipmentVariant((prev) => ({ ...prev, type: event.target.value }))
                  }
                >
                  <option value="">Tipo</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  placeholder="Variante"
                  value={newEquipmentVariant.name}
                  onChange={(event) =>
                    setNewEquipmentVariant((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </td>
              <td>
                <button type="button" onClick={handleAddEquipmentVariant}>
                  Add variante
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: '1.5rem' }}>
        <strong>Equipos - Estados</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {equipmentStatuses.map((status) => (
              <tr key={status.id}>
                <td>
                  <input
                    value={status.name}
                    onChange={(event) =>
                      updateEquipmentStatus(status.id, { name: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={status.isActive}
                    onChange={(event) =>
                      updateEquipmentStatus(status.id, { isActive: event.target.checked })
                    }
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="Estado"
                  value={newEquipmentStatus.name}
                  onChange={(event) =>
                    setNewEquipmentStatus((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </td>
              <td>
                <button type="button" onClick={handleAddEquipmentStatus}>
                  Add estado
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
