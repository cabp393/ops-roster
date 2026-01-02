import type { Equipment, Task, Worker } from '../types'

export type EquipmentRequirement = {
  type: string
  variant?: string | null
}

export function getTaskEquipmentRequirement(task: Task | undefined): EquipmentRequirement | null {
  if (!task?.equipmentType) return null
  return {
    type: task.equipmentType,
    variant: task.equipmentVariant ?? null,
  }
}

export function getEligibleEquipments(
  requirement: EquipmentRequirement | null,
  workerRole: string,
  equipments: Equipment[],
): Equipment[] {
  if (!requirement) return []
  return equipments
    .filter((equipment) => {
      if (equipment.status !== 'Operativa') return false
      if (equipment.type !== requirement.type) return false
      if (requirement.variant && equipment.variant !== requirement.variant) return false
      if (equipment.roleCode && equipment.roleCode !== workerRole) return false
      return true
    })
    .sort((a, b) => a.serie.localeCompare(b.serie))
}

type AssignEquipmentParams = {
  workerIds: number[]
  tasksByWorkerId: Record<number, string | null>
  equipments: Equipment[]
  taskById: Map<string, Task>
  workerById: Map<number, Worker>
}

export function assignEquipmentsForShift({
  workerIds,
  tasksByWorkerId,
  equipments,
  taskById,
  workerById,
}: AssignEquipmentParams): Record<number, string | null> {
  const assignments: Record<number, string | null> = {}
  const used = new Set<string>()

  workerIds.forEach((workerId) => {
    const worker = workerById.get(workerId)
    if (!worker) {
      assignments[workerId] = null
      return
    }
    const taskId = tasksByWorkerId[workerId] ?? null
    const requirement = getTaskEquipmentRequirement(taskId ? taskById.get(taskId) : undefined)
    if (!requirement) {
      assignments[workerId] = null
      return
    }
    const eligible = getEligibleEquipments(requirement, worker.roleCode, equipments)
    const available = eligible.find((equipment) => !used.has(equipment.id))
    if (!available) {
      assignments[workerId] = null
      return
    }
    assignments[workerId] = available.id
    used.add(available.id)
  })

  return assignments
}
