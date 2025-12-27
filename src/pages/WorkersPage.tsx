import { useEffect, useState } from 'react'
import { SHIFTS } from '../data/mock'
import { getRoles, getWorkers, setWorkers as setWorkersStorage } from '../lib/storage'
import type { Role, Shift, Worker } from '../types'

type WorkerFormState = {
  id: number | null
  name: string
  roleCode: string
  contract: Worker['contract']
  shiftMode: Worker['shiftMode']
  fixedShift: NonNullable<Worker['fixedShift']>
  allowedShifts: Record<Shift, boolean>
  isActive: boolean
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
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formState, setFormState] = useState<WorkerFormState>(() => ({
    id: null,
    name: '',
    roleCode: '',
    contract: 'Indefinido',
    shiftMode: 'Rotativo',
    fixedShift: 'M',
    allowedShifts: createDefaultAllowedShifts(),
    isActive: true,
  }))

  useEffect(() => {
    setWorkers(getWorkers())
    setRoles(getRoles())
  }, [])

  useEffect(() => {
    if (roles.length === 0) return
    setFormState((current) => {
      if (current.roleCode) return current
      return {
        ...current,
        roleCode: roles[0].code,
      }
    })
  }, [roles])

  function resetForm() {
    setEditingId(null)
    setFormState({
      id: null,
      name: '',
      roleCode: roles[0]?.code ?? '',
      contract: 'Indefinido',
      shiftMode: 'Rotativo',
      fixedShift: 'M',
      allowedShifts: createDefaultAllowedShifts(),
      isActive: true,
    })
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
      name: worker.name,
      roleCode: worker.roleCode,
      contract: worker.contract,
      shiftMode: worker.shiftMode,
      fixedShift: worker.fixedShift ?? 'M',
      allowedShifts: allowedShiftState,
      isActive: worker.isActive ?? true,
    })
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = formState.name.trim()
    if (!trimmedName) return
    const selectedShifts = SHIFTS.filter((shift) => formState.allowedShifts[shift])
    const useConstraints =
      selectedShifts.length > 0 && selectedShifts.length < SHIFTS.length
        ? { allowedShifts: selectedShifts }
        : undefined
    const updatedWorker: Worker = {
      id: formState.id ?? (workers.length ? Math.max(...workers.map((worker) => worker.id)) + 1 : 1),
      name: trimmedName,
      roleCode: formState.roleCode,
      contract: formState.contract,
      shiftMode: formState.shiftMode,
      fixedShift: formState.shiftMode === 'Fijo' ? formState.fixedShift : undefined,
      constraints: useConstraints,
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
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <div>
            <h2>{editingId ? 'Editar trabajador' : 'Nuevo trabajador'}</h2>
            <p className="subtitle">Administra los datos base de cada trabajador.</p>
          </div>
          <div className="button-row">
            <button type="submit">{editingId ? 'Guardar cambios' : 'Agregar'}</button>
            {editingId ? (
              <button type="button" onClick={resetForm}>
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            Nombre
            <input
              type="text"
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nombre y apellido"
              required
            />
          </label>
          <label className="field">
            Rol
            <select
              value={formState.roleCode}
              onChange={(event) => setFormState((current) => ({ ...current, roleCode: event.target.value }))}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.code}
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Contract</th>
              <th>Shift Mode</th>
              <th>Fixed Shift</th>
              <th>Allowed Shifts</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td>{worker.id}</td>
                <td>{worker.name}</td>
                <td>{worker.roleCode}</td>
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
