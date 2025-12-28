import { useEffect, useMemo, useState } from 'react'
import { SHIFTS } from '../data/mock'
import { getRoles, getTasks, getWorkers, setWorkers as setWorkersStorage } from '../lib/storage'
import { getWorkerDisplayName, getWorkerFullName } from '../lib/workerName'
import type { Role, Shift, Task, Worker } from '../types'

type WorkerFormState = {
  id: number | null
  firstName: string
  secondName: string
  lastName: string
  motherLastName: string
  roleCode: string
  contract: Worker['contract']
  shiftMode: Worker['shiftMode']
  fixedShift: NonNullable<Worker['fixedShift']>
  allowedShifts: Record<Shift, boolean>
  specialtyTaskId: string
  isActive: boolean
}

type FilterField =
  | 'role'
  | 'contract'
  | 'name'

function createDefaultAllowedShifts(): WorkerFormState['allowedShifts'] {
  return {
    M: true,
    T: true,
    N: true,
  }
}

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [formState, setFormState] = useState<WorkerFormState>(() => ({
    id: null,
    firstName: '',
    secondName: '',
    lastName: '',
    motherLastName: '',
    roleCode: '',
    contract: 'Indefinido',
    shiftMode: 'Rotativo',
    fixedShift: 'M',
    allowedShifts: createDefaultAllowedShifts(),
    specialtyTaskId: '',
    isActive: true,
  }))

  useEffect(() => {
    setWorkers(getWorkers())
    setRoles(getRoles())
    setTasks(getTasks())
  }, [])

  useEffect(() => {
    if (roles.length === 0) return
    setFormState((current) => {
      if (current.roleCode) return current
      const defaultRole = roles[0]?.code ?? ''
      const defaultTask = getDefaultSpecialty(defaultRole, tasks)
      return {
        ...current,
        roleCode: defaultRole,
        specialtyTaskId: defaultTask,
      }
    })
  }, [roles, tasks])

  const taskOptionsByRole = useMemo(() => {
    const map = new Map<string, Task[]>()
    roles.forEach((role) => {
      map.set(
        role.code,
        tasks.filter((task) => task.allowedRoleCodes.includes(role.code)),
      )
    })
    return map
  }, [roles, tasks])

  const specialtyLabelById = useMemo(() => new Map(tasks.map((task) => [task.id, task.name])), [tasks])

  const filteredWorkers = useMemo(() => {
    const nameValue = nameFilter.trim().toLowerCase()
    return workers.filter((worker) => {
      if (roleFilter && worker.roleCode !== roleFilter) return false
      if (contractFilter && worker.contract !== contractFilter) return false
      if (nameValue) {
        const fullName = getWorkerFullName(worker).toLowerCase()
        if (!fullName.includes(nameValue)) return false
      }
      return true
    })
  }, [workers, roleFilter, contractFilter, nameFilter])

  function getDefaultSpecialty(roleCode: string, availableTasks: Task[]) {
    return availableTasks.find((task) => task.allowedRoleCodes.includes(roleCode))?.id ?? ''
  }

  function handleOpenNew() {
    resetForm()
    setIsFormOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormState({
      id: null,
      firstName: '',
      secondName: '',
      lastName: '',
      motherLastName: '',
      roleCode: roles[0]?.code ?? '',
      contract: 'Indefinido',
      shiftMode: 'Rotativo',
      fixedShift: 'M',
      allowedShifts: createDefaultAllowedShifts(),
      specialtyTaskId: getDefaultSpecialty(roles[0]?.code ?? '', tasks),
      isActive: true,
    })
    setIsFormOpen(false)
  }

  function loadForEdit(worker: Worker) {
    const allowedShifts = worker.constraints?.allowedShifts
    const allowedShiftState =
      allowedShifts && allowedShifts.length > 0
        ? {
            M: allowedShifts.includes('M'),
            T: allowedShifts.includes('T'),
            N: allowedShifts.includes('N'),
          }
        : createDefaultAllowedShifts()
    setEditingId(worker.id)
    setFormState({
      id: worker.id,
      firstName: worker.firstName,
      secondName: worker.secondName ?? '',
      lastName: worker.lastName,
      motherLastName: worker.motherLastName ?? '',
      roleCode: worker.roleCode,
      contract: worker.contract,
      shiftMode: worker.shiftMode,
      fixedShift: worker.fixedShift ?? 'M',
      allowedShifts: allowedShiftState,
      specialtyTaskId: worker.specialtyTaskId ?? getDefaultSpecialty(worker.roleCode, tasks),
      isActive: worker.isActive ?? true,
    })
    setIsFormOpen(true)
  }

  function handleAllowedShiftChange(shift: Shift, checked: boolean) {
    setFormState((current) => ({
      ...current,
      allowedShifts: {
        ...current.allowedShifts,
        [shift]: checked,
      },
    }))
  }

  function handleRoleChange(roleCode: string) {
    setFormState((current) => {
      const allowedTasks = taskOptionsByRole.get(roleCode) ?? []
      const fallbackSpecialty =
        allowedTasks.find((task) => task.id === current.specialtyTaskId)?.id ??
        getDefaultSpecialty(roleCode, tasks)
      return {
        ...current,
        roleCode,
        specialtyTaskId: fallbackSpecialty,
      }
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedFirstName = formState.firstName.trim()
    const trimmedLastName = formState.lastName.trim()
    if (!trimmedFirstName || !trimmedLastName) return
    const selectedShifts = SHIFTS.filter((shift) => formState.allowedShifts[shift])
    const useConstraints =
      selectedShifts.length > 0 && selectedShifts.length < SHIFTS.length
        ? { allowedShifts: selectedShifts }
        : undefined
    const updatedWorker: Worker = {
      id: formState.id ?? (workers.length ? Math.max(...workers.map((worker) => worker.id)) + 1 : 1),
      firstName: trimmedFirstName,
      secondName: formState.secondName.trim(),
      lastName: trimmedLastName,
      motherLastName: formState.motherLastName.trim(),
      roleCode: formState.roleCode,
      contract: formState.contract,
      shiftMode: formState.shiftMode,
      fixedShift: formState.shiftMode === 'Fijo' ? formState.fixedShift : undefined,
      constraints: useConstraints,
      specialtyTaskId: formState.specialtyTaskId || null,
      isActive: formState.isActive,
    }

    const nextWorkers = formState.id
      ? workers.map((worker) => (worker.id === formState.id ? updatedWorker : worker))
      : [...workers, updatedWorker]
    setWorkers(nextWorkers)
    setWorkersStorage(nextWorkers)
    resetForm()
  }

  function handleDelete(id: number) {
    const nextWorkers = workers.filter((worker) => worker.id !== id)
    setWorkers(nextWorkers)
    setWorkersStorage(nextWorkers)
    if (editingId === id) {
      resetForm()
    }
  }

  return (
    <section>
      <div className="workers-toolbar">
        <div className="filters-card">
          <div className="filters-row">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Cargo</option>
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
            <select value={contractFilter} onChange={(event) => setContractFilter(event.target.value)}>
              <option value="">Tipo de contrato</option>
              <option value="Indefinido">Indefinido</option>
              <option value="Plazo fijo">Plazo fijo</option>
            </select>
            <input
              type="text"
              value={nameFilter}
              onChange={(event) => setNameFilter(event.target.value)}
              placeholder="Nombre convencional"
            />
          </div>
        </div>
        <button type="button" className="add-worker-button" onClick={handleOpenNew} aria-label="Añadir trabajador">
          +
        </button>
      </div>
      {isFormOpen ? (
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-header">
            <div>
              <h2>{editingId ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
              <p className="subtitle">Administra los datos base de cada trabajador.</p>
            </div>
            <div className="button-row">
              <button type="submit">{editingId ? 'Guardar cambios' : 'Agregar'}</button>
              <button type="button" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              Primer nombre
              <input
                type="text"
                value={formState.firstName}
                onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))}
                placeholder="Primer nombre"
                required
              />
            </label>
            <label className="field">
              Segundo nombre
              <input
                type="text"
                value={formState.secondName}
                onChange={(event) => setFormState((current) => ({ ...current, secondName: event.target.value }))}
                placeholder="Segundo nombre"
              />
            </label>
            <label className="field">
              Apellido paterno
              <input
                type="text"
                value={formState.lastName}
                onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))}
                placeholder="Apellido paterno"
                required
              />
            </label>
            <label className="field">
              Apellido materno
              <input
                type="text"
                value={formState.motherLastName}
                onChange={(event) => setFormState((current) => ({ ...current, motherLastName: event.target.value }))}
                placeholder="Apellido materno"
              />
            </label>
            <label className="field">
              Rol
              <select value={formState.roleCode} onChange={(event) => handleRoleChange(event.target.value)}>
                {roles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Especialidad
              <select
                value={formState.specialtyTaskId}
                onChange={(event) => setFormState((current) => ({ ...current, specialtyTaskId: event.target.value }))}
              >
                <option value="">Sin especialidad</option>
                {(taskOptionsByRole.get(formState.roleCode) ?? []).map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Contrato
              <select
                value={formState.contract}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, contract: event.target.value as Worker['contract'] }))
                }
              >
                <option value="Indefinido">Indefinido</option>
                <option value="Plazo fijo">Plazo fijo</option>
              </select>
            </label>
            <label className="field">
              Modalidad
              <select
                value={formState.shiftMode}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, shiftMode: event.target.value as Worker['shiftMode'] }))
                }
              >
                <option value="Rotativo">Rotativo</option>
                <option value="Fijo">Fijo</option>
              </select>
            </label>
            <label className="field">
              Turno fijo
              <select
                value={formState.fixedShift}
                disabled={formState.shiftMode !== 'Fijo'}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, fixedShift: event.target.value as Worker['fixedShift'] }))
                }
              >
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Activo
              <select
                value={formState.isActive ? 'active' : 'inactive'}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, isActive: event.target.value === 'active' }))
                }
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
          </div>
          <div className="field">
            Turnos permitidos
            <div className="checkbox-row">
              {SHIFTS.map((shift) => (
                <label key={shift} className="checkbox-pill">
                  <input
                    type="checkbox"
                    checked={formState.allowedShifts[shift]}
                    onChange={(event) => handleAllowedShiftChange(shift, event.target.checked)}
                  />
                  {shift}
                </label>
              ))}
            </div>
          </div>
        </form>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Especialidad</th>
              <th>Contrato</th>
              <th>Modalidad</th>
              <th>Turno fijo</th>
              <th>Turnos permitidos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((worker) => (
              <tr key={worker.id}>
                <td>{worker.id}</td>
                <td>{getWorkerDisplayName(worker)}</td>
                <td>{worker.roleCode}</td>
                <td>{worker.specialtyTaskId ? specialtyLabelById.get(worker.specialtyTaskId) ?? '-' : '-'}</td>
                <td>{worker.contract}</td>
                <td>{worker.shiftMode}</td>
                <td>{worker.fixedShift ?? '-'}</td>
                <td>
                  {worker.constraints?.allowedShifts && worker.constraints.allowedShifts.length > 0
                    ? worker.constraints.allowedShifts.join(', ')
                    : 'Todas'}
                </td>
                <td>{worker.isActive === false ? 'Inactivo' : 'Activo'}</td>
                <td>
                  <div className="button-row">
                    <button type="button" className="icon-button" onClick={() => loadForEdit(worker)} aria-label="Editar">
                      ✏️
                    </button>
                    <button type="button" className="icon-button" onClick={() => handleDelete(worker.id)} aria-label="Borrar">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
