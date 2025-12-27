import { useEffect, useMemo, useState } from 'react'
import { getRoles, getTasks, setRoles, setTasks } from '../lib/storage'
import type { Role, Task } from '../types'

function parseRoleCodes(input: string) {
  return input
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
}

export function SetupPage() {
  const [roles, setRolesState] = useState<Role[]>([])
  const [tasks, setTasksState] = useState<Task[]>([])
  const [newRole, setNewRole] = useState({ code: '', name: '' })
  const [newTask, setNewTask] = useState({ name: '', allowedRoleCodes: '' })

  useEffect(() => {
    setRolesState(getRoles())
    setTasksState(getTasks())
  }, [])

  useEffect(() => {
    if (roles.length > 0) setRoles(roles)
  }, [roles])

  useEffect(() => {
    if (tasks.length > 0) setTasks(tasks)
  }, [tasks])

  const activeRoleCodes = useMemo(() => roles.map((role) => role.code).join(', '), [roles])

  function updateRole(id: string, patch: Partial<Role>) {
    setRolesState((prev) => prev.map((role) => (role.id === id ? { ...role, ...patch } : role)))
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasksState((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
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
    }
    setTasksState((prev) => [...prev, nextTask])
    setNewTask({ name: '', allowedRoleCodes: '' })
  }

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
              <th>Balance</th>
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
                    checked={role.countsForBalance}
                    onChange={(event) => updateRole(role.id, { countsForBalance: event.target.checked })}
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
              <td colSpan={2}>
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
              <th>Name</th>
              <th>Allowed roles (comma)</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <input
                    value={task.name}
                    onChange={(event) => updateTask(task.id, { name: event.target.value })}
                  />
                </td>
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
                  placeholder="Task name"
                  value={newTask.name}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, name: event.target.value }))}
                />
              </td>
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
                <button type="button" onClick={handleAddTask}>
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
