import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { getContracts, getRoles, getTasks, setContracts, setRoles, setTasks } from '../lib/storage'
import type { ContractType, Role, Task } from '../types'

function parseRoleCodes(input: string) {
  return input
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
}

export function SetupPage() {
  const [roles, setRolesState] = useState<Role[]>([])
  const [tasks, setTasksState] = useState<Task[]>([])
  const [contracts, setContractsState] = useState<ContractType[]>([])
  const [newRole, setNewRole] = useState({ code: '', name: '' })
  const [newTask, setNewTask] = useState({ name: '', allowedRoleCodes: '' })
  const [newContract, setNewContract] = useState({ name: '' })
  const [isEditMode, setIsEditMode] = useState(true)

  useEffect(() => {
    setRolesState(getRoles())
    setTasksState(getTasks())
    setContractsState(getContracts())
  }, [])

  useEffect(() => {
    if (roles.length > 0) setRoles(roles)
  }, [roles])

  useEffect(() => {
    if (tasks.length > 0) setTasks(tasks)
  }, [tasks])

  useEffect(() => {
    if (contracts.length > 0) setContracts(contracts)
  }, [contracts])

  const activeRoleCodes = useMemo(() => roles.map((role) => role.code).join(', '), [roles])
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const roleA = a.allowedRoleCodes[0] ?? ''
        const roleB = b.allowedRoleCodes[0] ?? ''
        const roleSort = roleA.localeCompare(roleB)
        if (roleSort !== 0) return roleSort
        return a.name.localeCompare(b.name)
      }),
    [tasks],
  )

  function updateRole(id: string, patch: Partial<Role>) {
    setRolesState((prev) => prev.map((role) => (role.id === id ? { ...role, ...patch } : role)))
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasksState((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }

  function updateContract(id: string, patch: Partial<ContractType>) {
    setContractsState((prev) =>
      prev.map((contract) => (contract.id === id ? { ...contract, ...patch } : contract)),
    )
  }

  function handleAddRole() {
    if (!newRole.code.trim() || !newRole.name.trim()) return
    const nextRole: Role = {
      id: `role-${Date.now()}`,
      code: newRole.code.trim().toUpperCase(),
      name: newRole.name.trim(),
      color: '#6d28d9',
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
    }
    setTasksState((prev) => [...prev, nextTask])
    setNewTask({ name: '', allowedRoleCodes: '' })
  }

  function handleAddContract() {
    if (!newContract.name.trim()) return
    const nextContract: ContractType = {
      id: `contract-${Date.now()}`,
      name: newContract.name.trim(),
      color: '#64748b',
    }
    setContractsState((prev) => [...prev, nextContract])
    setNewContract({ name: '' })
  }

  return (
    <section>
      <div className="summary">
        <strong>Modo de configuración</strong>
      </div>
      <div className="planning-actions" style={{ alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div className="button-row">
          <button
            type="button"
            className="icon-button"
            onClick={() => setIsEditMode((current) => !current)}
            aria-label={isEditMode ? 'Cambiar a visualización' : 'Cambiar a edición'}
          >
            {isEditMode ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <span>{isEditMode ? 'Edición' : 'Visualización'}</span>
        </div>
      </div>
      <div className="summary">
        <strong>Roles manager</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Color</th>
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
                    disabled={!isEditMode}
                  />
                </td>
                <td>
                  <input
                    value={role.name}
                    onChange={(event) => updateRole(role.id, { name: event.target.value })}
                    disabled={!isEditMode}
                  />
                </td>
                <td>
                  <input
                    type="color"
                    className="color-swatch"
                    value={role.color}
                    onChange={(event) => updateRole(role.id, { color: event.target.value })}
                    disabled={!isEditMode}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={role.isActive}
                    onChange={(event) => updateRole(role.id, { isActive: event.target.checked })}
                    disabled={!isEditMode}
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
                  disabled={!isEditMode}
                />
              </td>
              <td>
                <input
                  placeholder="Name"
                  value={newRole.name}
                  onChange={(event) => setNewRole((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={!isEditMode}
                />
              </td>
              <td colSpan={2}>
                <button type="button" onClick={handleAddRole} disabled={!isEditMode}>
                  Add role
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="summary" style={{ marginTop: '1.5rem' }}>
        <strong>Contracts manager</strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Color</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>
                  <input
                    value={contract.name}
                    onChange={(event) => updateContract(contract.id, { name: event.target.value })}
                    disabled={!isEditMode}
                  />
                </td>
                <td>
                  <input
                    type="color"
                    className="color-swatch"
                    value={contract.color}
                    onChange={(event) => updateContract(contract.id, { color: event.target.value })}
                    disabled={!isEditMode}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="Tipo de contrato"
                  value={newContract.name}
                  onChange={(event) => setNewContract((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={!isEditMode}
                />
              </td>
              <td>
                <button type="button" onClick={handleAddContract} disabled={!isEditMode}>
                  Add contract
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
              <th>Name</th>
              <th>Allowed roles (comma)</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <input
                    value={task.name}
                    onChange={(event) => updateTask(task.id, { name: event.target.value })}
                    disabled={!isEditMode}
                  />
                </td>
                <td>
                  <input
                    value={task.allowedRoleCodes.join(', ')}
                    onChange={(event) =>
                      updateTask(task.id, { allowedRoleCodes: parseRoleCodes(event.target.value) })
                    }
                    disabled={!isEditMode}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={task.isActive}
                    onChange={(event) => updateTask(task.id, { isActive: event.target.checked })}
                    disabled={!isEditMode}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <input
                  placeholder="Task name"
                  value={newTask.name}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={!isEditMode}
                />
              </td>
              <td>
                <input
                  placeholder="OG, AL"
                  value={newTask.allowedRoleCodes}
                  onChange={(event) =>
                    setNewTask((prev) => ({ ...prev, allowedRoleCodes: event.target.value }))
                  }
                  disabled={!isEditMode}
                />
              </td>
              <td>
                <button type="button" onClick={handleAddTask} disabled={!isEditMode}>
                  Add task
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
