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
  | 'name'
  | 'role'
  | 'contract'
  | 'shiftMode'
  | 'fixedShift'
  | 'specialty'
  | 'status'

type WorkerFilter = {
  id: number
  field: FilterField
  value: string
}

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
  const [filters, setFilters] = useState<WorkerFilter[]>([
    { id: 1, field: 'name', value: '' },
  ])
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
    if (filters.length === 0) return workers
    return workers.filter((worker) => {
      return filters.every((filter) => {
        const value = filter.value.trim().toLowerCase()
        if (!value) return true
        const fieldValue = getFilterValue(worker, filter.field).toLowerCase()
        return fieldValue.includes(value)
      })
    })
  }, [filters, workers, specialtyLabelById])

  function getDefaultSpecialty(roleCode: string, availableTasks: Task[]) {
    return availableTasks.find((task) => task.allowedRoleCodes.includes(roleCode))?.id ?? ''
  }

  function getFilterValue(worker: Worker, field: FilterField): string {
    switch (field) {
      case 'name':
        return getWorkerFullName(worker)
      case 'role':
        return worker.roleCode
      case 'contract':
        return worker.contract
      case 'shiftMode':
        return worker.shiftMode
      case 'fixedShift':
        return worker.fixedShift ?? ''
      case 'specialty':
        return worker.specialtyTaskId ? specialtyLabelById.get(worker.specialtyTaskId) ?? '' : ''
      case 'status':
        return worker.isActive === false ? 'Inactivo' : 'Activo'
      default:
        return ''
    }
  }

  function handleOpenNew() {
    resetForm()
    setIsFormOpen(true)
  }

  function addFilter() {
    setFilters((current) => [
      ...current,
      { id: Date.now(), field: 'name', value: '' },
    ])
  }

  function updateFilter(id: number, updates: Partial<WorkerFilter>) {
    setFilters((current) => current.map((filter) => (filter.id === id ? { ...filter, ...updates } : filter)))
  }

  function removeFilter(id: number) {
    setFilters((current) => current.filter((filter) => filter.id !== id))
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
      <div className="workers-toolbar button-row">
        <button type="button" onClick={handleOpenNew}>
          Añadir trabajador
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
      <div className="filters-card">
        <div className="filters-header">
          <div>
            <h3>Filtros</h3>
            <p className="subtitle">Combina varios filtros de texto simultáneamente.</p>
          </div>
          <button type="button" onClick={addFilter}>
            Agregar filtro
          </button>
        </div>
        <div className="filters-list">
          {filters.map((filter) => (
            <div key={filter.id} className="filter-row">
              <div className="filter-input">
                <span className="filter-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                    <path
                      d="M3 4.5h14l-5.25 6.2v4.1l-3.5 1.7v-5.8L3 4.5z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(event) => updateFilter(filter.id, { value: event.target.value })}
                  placeholder="Buscar..."
                />
              </div>
              <select value={filter.field} onChange={(event) => updateFilter(filter.id, { field: event.target.value as FilterField })}>
                <option value="name">Nombre</option>
                <option value="role">Rol</option>
                <option value="contract">Contrato</option>
                <option value="shiftMode">Modalidad</option>
                <option value="fixedShift">Turno fijo</option>
                <option value="specialty">Especialidad</option>
                <option value="status">Estado</option>
              </select>
              <button type="button" className="icon-button" onClick={() => removeFilter(filter.id)} aria-label="Quitar filtro">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
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
