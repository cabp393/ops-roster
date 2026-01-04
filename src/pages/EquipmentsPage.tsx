import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  getEquipmentRoles,
  getEquipmentStatuses,
  getEquipmentTypes,
  getEquipmentVariants,
  getEquipments,
  setEquipments,
} from '../lib/storage'
import { useOrganization } from '../lib/organizationContext'
import type {
  Equipment,
  EquipmentRoleOption,
  EquipmentStatusOption,
  EquipmentTypeOption,
  EquipmentVariantOption,
} from '../types'

type EquipmentFormState = {
  id: string
  serie: string
  roleCode: string
  type: string
  variant: string
  status: string
}

export function EquipmentsPage() {
  const { activeOrganizationId } = useOrganization()
  const [equipments, setEquipmentsState] = useState<Equipment[]>([])
  const [equipmentRoles, setEquipmentRolesState] = useState<EquipmentRoleOption[]>([])
  const [equipmentTypes, setEquipmentTypesState] = useState<EquipmentTypeOption[]>([])
  const [equipmentVariants, setEquipmentVariantsState] = useState<EquipmentVariantOption[]>([])
  const [equipmentStatuses, setEquipmentStatusesState] = useState<EquipmentStatusOption[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [serieFilter, setSerieFilter] = useState('')
  const [formState, setFormState] = useState<EquipmentFormState>({
    id: '',
    serie: '',
    roleCode: '',
    type: '',
    variant: '',
    status: '',
  })

  useEffect(() => {
    if (!activeOrganizationId) return
    let isMounted = true
    const loadData = async () => {
      const [equipmentsData, rolesData, typesData, variantsData, statusesData] = await Promise.all([
        getEquipments(activeOrganizationId),
        getEquipmentRoles(activeOrganizationId),
        getEquipmentTypes(activeOrganizationId),
        getEquipmentVariants(activeOrganizationId),
        getEquipmentStatuses(activeOrganizationId),
      ])
      if (!isMounted) return
      setEquipmentsState(equipmentsData)
      setEquipmentRolesState(rolesData)
      setEquipmentTypesState(typesData)
      setEquipmentVariantsState(variantsData)
      setEquipmentStatusesState(statusesData)
    }
    void loadData()
    return () => {
      isMounted = false
    }
  }, [activeOrganizationId])

  const variantsByType = useMemo(() => {
    const map = new Map<string, EquipmentVariantOption[]>()
    equipmentVariants.forEach((variant) => {
      const list = map.get(variant.type) ?? []
      list.push(variant)
      map.set(variant.type, list)
    })
    return map
  }, [equipmentVariants])

  const filteredEquipments = useMemo(() => {
    const serieValue = serieFilter.trim().toLowerCase()
    return equipments
      .filter((equipment) => {
        if (roleFilter && equipment.roleCode !== roleFilter) return false
        if (typeFilter && equipment.type !== typeFilter) return false
        if (statusFilter && equipment.status !== statusFilter) return false
        if (serieValue && !equipment.serie.toLowerCase().includes(serieValue)) return false
        return true
      })
      .sort((a, b) => a.serie.localeCompare(b.serie))
  }, [equipments, roleFilter, serieFilter, statusFilter, typeFilter])

  function resetForm() {
    setEditingId(null)
    const defaultRole = equipmentRoles[0]?.code ?? ''
    const defaultType = equipmentTypes[0]?.name ?? ''
    const defaultVariant = (variantsByType.get(defaultType) ?? [])[0]?.name ?? ''
    const defaultStatus = equipmentStatuses[0]?.name ?? ''
    setFormState({
      id: '',
      serie: '',
      roleCode: defaultRole,
      type: defaultType,
      variant: defaultVariant,
      status: defaultStatus,
    })
    setIsFormOpen(false)
  }

  function handleOpenNew() {
    resetForm()
    setIsFormOpen(true)
  }

  function loadForEdit(equipment: Equipment) {
    setEditingId(equipment.id)
    setFormState({
      id: equipment.id,
      serie: equipment.serie,
      roleCode: equipment.roleCode,
      type: equipment.type,
      variant: equipment.variant,
      status: equipment.status,
    })
    setIsFormOpen(true)
  }

  function handleTypeChange(nextType: string) {
    const availableVariants = variantsByType.get(nextType) ?? []
    const nextVariant =
      availableVariants.find((variant) => variant.name === formState.variant)?.name ??
      availableVariants[0]?.name ??
      ''
    setFormState((current) => ({
      ...current,
      type: nextType,
      variant: nextVariant,
    }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedSerie = formState.serie.trim()
    if (!trimmedSerie) return
    const hasDuplicate = equipments.some(
      (equipment) =>
        equipment.serie.toLowerCase() === trimmedSerie.toLowerCase() &&
        equipment.id !== editingId,
    )
    if (hasDuplicate) return
    const availableVariants = variantsByType.get(formState.type) ?? []
    const selectedVariant =
      availableVariants.find((variant) => variant.name === formState.variant)?.name ??
      availableVariants[0]?.name ??
      ''
    const nextEquipment: Equipment = {
      id: editingId ?? `equipment-${Date.now()}`,
      serie: trimmedSerie,
      roleCode: formState.roleCode,
      type: formState.type,
      variant: selectedVariant,
      status: formState.status,
    }
    const nextEquipments = editingId
      ? equipments.map((equipment) => (equipment.id === editingId ? nextEquipment : equipment))
      : [...equipments, nextEquipment]
    setEquipmentsState(nextEquipments)
    if (activeOrganizationId) {
      void setEquipments(nextEquipments, activeOrganizationId)
    }
    resetForm()
  }

  function handleDelete(id: string) {
    const nextEquipments = equipments.filter((equipment) => equipment.id !== id)
    setEquipmentsState(nextEquipments)
    if (activeOrganizationId) {
      void setEquipments(nextEquipments, activeOrganizationId)
    }
    if (editingId === id) resetForm()
  }

  return (
    <section>
      <div className="workers-toolbar">
        <div className="filters-card">
          <div className="filters-row equipment-filters">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Rol</option>
              {equipmentRoles.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.code}
                </option>
              ))}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Tipo</option>
              {equipmentTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Estado</option>
              {equipmentStatuses.map((status) => (
                <option key={status.id} value={status.name}>
                  {status.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={serieFilter}
              onChange={(event) => setSerieFilter(event.target.value)}
              placeholder="Serie"
            />
          </div>
        </div>
        <button type="button" className="add-worker-button" onClick={handleOpenNew} aria-label="Añadir equipo">
          +
        </button>
      </div>
      {isFormOpen ? (
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-header">
            <div>
              <h2>{editingId ? 'Editar equipo' : 'Nuevo equipo'}</h2>
              <p className="subtitle">Administra los equipos disponibles.</p>
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
              Serie
              <input
                type="text"
                value={formState.serie}
                onChange={(event) => setFormState((current) => ({ ...current, serie: event.target.value }))}
                placeholder="Serie única"
                required
              />
            </label>
            <label className="field">
              Rol
              <select
                value={formState.roleCode}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, roleCode: event.target.value }))
                }
              >
                {equipmentRoles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Tipo
              <select value={formState.type} onChange={(event) => handleTypeChange(event.target.value)}>
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
                value={formState.variant}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, variant: event.target.value }))
                }
              >
                {(variantsByType.get(formState.type) ?? []).map((variant) => (
                  <option key={variant.id} value={variant.name}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Estado
              <select
                value={formState.status}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, status: event.target.value }))
                }
              >
                {equipmentStatuses.map((status) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </form>
      ) : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Serie</th>
              <th>Rol</th>
              <th>Tipo</th>
              <th>Variante</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredEquipments.map((equipment) => (
              <tr key={equipment.id}>
                <td>{equipment.serie}</td>
                <td>{equipment.roleCode}</td>
                <td>{equipment.type}</td>
                <td>{equipment.variant}</td>
                <td>{equipment.status}</td>
                <td>
                  <div className="button-row">
                    <button type="button" className="icon-button" onClick={() => loadForEdit(equipment)} aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="icon-button" onClick={() => handleDelete(equipment.id)} aria-label="Borrar">
                      <Trash2 size={14} />
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
