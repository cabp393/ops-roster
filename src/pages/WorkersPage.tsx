import { useEffect, useMemo, useState } from 'react'
import { Clock3, Pencil, Trash2 } from 'lucide-react'
import { SHIFTS } from '../data/mock'
import { getRoles, getShiftHistoryByWorker, getTasks, getWorkers, setWorkers as setWorkersStorage } from '../lib/storage'
import { getWorkerDisplayName, getWorkerFullName } from '../lib/workerName'
import { useOrganization } from '../lib/organizationContext'
import type { Role, Shift, ShiftHistoryEntry, Task, Worker } from '../types'

type WorkerFormState = {
  id: string
  firstName: string
  secondName: string
  lastName: string
  motherLastName: string
  roleCode: string
  contract: Worker['contract']
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
  const { activeOrganizationId, canWrite } = useOrganization()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [historyWorkerId, setHistoryWorkerId] = useState<number | null>(null)
  const [historyEntries, setHistoryEntries] = useState<ShiftHistoryEntry[]>([])
  const [historyPage, setHistoryPage] = useState(0)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [contractFilter, setContractFilter] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [formState, setFormState] = useState<WorkerFormState>(() => ({
    id: '',
    firstName: '',
    secondName: '',
    lastName: '',
    motherLastName: '',
    roleCode: '',
    contract: 'Indefinido',
    allowedShifts: createDefaultAllowedShifts(),
    specialtyTaskId: '',
    isActive: true,
  }))

  useEffect(() => {
    if (!activeOrganizationId) return
    let isMounted = true
    const loadData = async () => {
      const [workersData, rolesData, tasksData] = await Promise.all([
        getWorkers(activeOrganizationId),
        getRoles(activeOrganizationId),
        getTasks(activeOrganizationId),
      ])
      if (!isMounted) return
      setWorkers(workersData)
      setRoles(rolesData)
      setTasks(tasksData)
    }
    void loadData()
    return () => {
      isMounted = false
    }
  }, [activeOrganizationId])

  useEffect(() => {
    setHistoryWorkerId(null)
    setHistoryEntries([])
    setHistoryPage(0)
    setHistoryHasMore(false)
    setHistoryLoading(false)
  }, [activeOrganizationId])

  useEffect(() => {
    if (!activeOrganizationId || historyWorkerId === null) return
    let isMounted = true
    setHistoryLoading(true)
    const loadHistory = async () => {
      const { entries, hasMore } = await getShiftHistoryByWorker(
        activeOrganizationId,
        historyWorkerId,
        20,
        historyPage * 20,
      )
      if (!isMounted) return
      setHistoryEntries((current) => (historyPage === 0 ? entries : [...current, ...entries]))
      setHistoryHasMore(hasMore)
      setHistoryLoading(false)
    }
    void loadHistory()
    return () => {
      isMounted = false
    }
  }, [activeOrganizationId, historyWorkerId, historyPage])

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
    return workers
      .filter((worker) => {
        if (roleFilter && worker.roleCode !== roleFilter) return false
        if (contractFilter && worker.contract !== contractFilter) return false
        if (nameValue) {
          const fullName = getWorkerFullName(worker).toLowerCase()
          if (!fullName.includes(nameValue)) return false
        }
        return true
      })
      .sort((a, b) => a.id - b.id)
  }, [workers, roleFilter, contractFilter, nameFilter])

  function getDefaultSpecialty(roleCode: string, availableTasks: Task[]) {
    return availableTasks.find((task) => task.allowedRoleCodes.includes(roleCode))?.id ?? ''
  }

  function handleOpenNew() {
    if (!canWrite) return
    resetForm()
    setIsFormOpen(true)
  }

  function resetForm() {
    setEditingId(null)
    setFormState({
      id: '',
      firstName: '',
      secondName: '',
      lastName: '',
      motherLastName: '',
      roleCode: roles[0]?.code ?? '',
      contract: 'Indefinido',
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
      id: String(worker.id),
      firstName: worker.firstName,
      secondName: worker.secondName ?? '',
      lastName: worker.lastName,
      motherLastName: worker.motherLastName ?? '',
      roleCode: worker.roleCode,
      contract: worker.contract,
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
    if (!canWrite) return
    const nextId = Number(formState.id)
    if (!Number.isInteger(nextId) || nextId <= 0) return
    const trimmedFirstName = formState.firstName.trim()
    const trimmedLastName = formState.lastName.trim()
    if (!trimmedFirstName || !trimmedLastName) return
    if (workers.some((worker) => worker.id === nextId && worker.id !== editingId)) return
    const selectedShifts = SHIFTS.filter((shift) => formState.allowedShifts[shift])
    const useConstraints =
      selectedShifts.length > 0 && selectedShifts.length < SHIFTS.length
        ? { allowedShifts: selectedShifts }
        : undefined
    const updatedWorker: Worker = {
      id: nextId,
      firstName: trimmedFirstName,
      secondName: formState.secondName.trim(),
      lastName: trimmedLastName,
      motherLastName: formState.motherLastName.trim(),
      roleCode: formState.roleCode,
      contract: formState.contract,
      constraints: useConstraints,
      specialtyTaskId: formState.specialtyTaskId || null,
      isActive: formState.isActive,
    }

    const nextWorkers = editingId
      ? workers.map((worker) => (worker.id === editingId ? updatedWorker : worker))
      : [...workers, updatedWorker]
    setWorkers(nextWorkers)
    if (activeOrganizationId) {
      void setWorkersStorage(nextWorkers, activeOrganizationId)
    }
    resetForm()
  }

  function handleDelete(id: number) {
    if (!canWrite) return
    const nextWorkers = workers.filter((worker) => worker.id !== id)
    setWorkers(nextWorkers)
    if (activeOrganizationId) {
      void setWorkersStorage(nextWorkers, activeOrganizationId)
    }
    if (editingId === id) {
      resetForm()
    }
  }

  function formatHistoryWeek(value: string) {
    const parsed = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString('es-AR')
  }

  function formatHistoryTimestamp(value: string) {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString('es-AR')
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
        <button
          type="button"
          className="add-worker-button"
          onClick={handleOpenNew}
          aria-label="Añadir trabajador"
          disabled={!canWrite}
        >
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
              <button type="submit" disabled={!canWrite}>
                {editingId ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button type="button" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              ID
              <input
                type="number"
                min={1}
                value={formState.id}
                onChange={(event) => setFormState((current) => ({ ...current, id: event.target.value }))}
                placeholder="ID del trabajador"
                required
              />
            </label>
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
                <td>
                  {worker.constraints?.allowedShifts && worker.constraints.allowedShifts.length > 0
                    ? worker.constraints.allowedShifts.join(', ')
                    : 'Todas'}
                </td>
                <td>{worker.isActive === false ? 'Inactivo' : 'Activo'}</td>
                <td>
                  <div className="button-row">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => loadForEdit(worker)}
                      aria-label="Editar"
                      disabled={!canWrite}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => handleDelete(worker.id)}
                      aria-label="Borrar"
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
      <div className="history-card">
        <div className="history-header">
          <div>
            <h3>Historial de turnos</h3>
            <p className="subtitle">Consulta los turnos guardados por trabajador.</p>
          </div>
          <Clock3 size={18} />
        </div>
        <div className="history-toolbar">
          <label className="field">
            Trabajador
            <select
              value={historyWorkerId ?? ''}
              onChange={(event) => {
                const nextValue = event.target.value ? Number(event.target.value) : null
                setHistoryWorkerId(nextValue)
                setHistoryEntries([])
                setHistoryPage(0)
                setHistoryHasMore(false)
                setHistoryLoading(false)
              }}
            >
              <option value="">Selecciona un trabajador</option>
              {workers
                .slice()
                .sort((a, b) => a.id - b.id)
                .map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.id} · {getWorkerDisplayName(worker)}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {historyWorkerId === null ? (
          <p className="empty-state">Selecciona un trabajador para ver su historial.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Turno</th>
                  <th>Tarea</th>
                  <th>Equipo</th>
                  <th>Fuente</th>
                  <th>Registrado</th>
                </tr>
              </thead>
              <tbody>
                {historyEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {historyLoading ? 'Cargando historial...' : 'Sin registros para este trabajador.'}
                    </td>
                  </tr>
                ) : (
                  historyEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatHistoryWeek(entry.weekStart)}</td>
                      <td>{entry.shift}</td>
                      <td>{entry.taskName ?? entry.taskId ?? '-'}</td>
                      <td>{entry.equipmentSerie ?? entry.equipmentId ?? '-'}</td>
                      <td>{entry.source}</td>
                      <td>{formatHistoryTimestamp(entry.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {historyWorkerId !== null ? (
          <div className="history-pagination">
            <button
              type="button"
              onClick={() => setHistoryPage((current) => Math.max(current - 1, 0))}
              disabled={historyPage === 0 || historyLoading}
            >
              Página anterior
            </button>
            <span>Página {historyPage + 1}</span>
            <button
              type="button"
              onClick={() => setHistoryPage((current) => (historyHasMore ? current + 1 : current))}
              disabled={!historyHasMore || historyLoading}
            >
              Página siguiente
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
