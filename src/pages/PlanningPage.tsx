import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DragOverlay,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Lock,
  Rocket,
  Save,
  Trash2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { SHIFT_LABEL, SHIFTS } from '../data/mock'
import {
  assignEquipmentsForShift,
  getEligibleEquipments,
  getTaskEquipmentRequirement,
} from '../lib/equipment'
import {
  clearWeekPlan,
  getShiftsByWorker,
  loadWeekPlan,
  saveWeekPlan,
  seedWeekPlan,
} from '../lib/planningBoard'
import {
  formatDate,
  getIsoWeekNumber,
  getIsoWeekYear,
  getWeekRangeLabel,
  getWeekStartDate,
} from '../lib/week'
import { getEquipments, getTasks, getWorkers } from '../lib/storage'
import { getWorkerDisplayName } from '../lib/workerName'
import type { Equipment, Shift, Task, WeekPlan, Worker } from '../types'

const emptyPlan: WeekPlan = {
  weekStart: '2025-12-29',
  columns: { M: [], T: [], N: [] },
  tasksByWorkerId: {},
  equipmentByWorkerId: {},
}

const planningShiftOrder: Shift[] = ['N', 'M', 'T']
const ROLE_ORDER = ['AL', 'OG', 'JT'] as const
type RoleCode = (typeof ROLE_ORDER)[number]
const COLLAPSE_STORAGE_KEY = 'opsRoster:planning:roleCollapse'
const ROLE_ORDER_INDEX = new Map(ROLE_ORDER.map((role, index) => [role, index]))
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function allowedShiftsForWorker(worker: Worker): Shift[] {
  return worker.constraints?.allowedShifts ?? SHIFTS
}

function sanitizePlan(plan: WeekPlan, activeIds: Set<number>): WeekPlan {
  const tasksByWorkerId: Record<number, string | null> = {}
  const equipmentByWorkerId: Record<number, string | null> = {}
  Object.entries(plan.tasksByWorkerId).forEach(([key, value]) => {
    const id = Number(key)
    if (Number.isNaN(id) || !activeIds.has(id)) return
    tasksByWorkerId[id] = value
  })
  Object.entries(plan.equipmentByWorkerId ?? {}).forEach(([key, value]) => {
    const id = Number(key)
    if (Number.isNaN(id) || !activeIds.has(id)) return
    equipmentByWorkerId[id] = value
  })

  const columns = SHIFTS.reduce<Record<Shift, number[]>>(
    (acc, shift) => {
      acc[shift] = (plan.columns[shift] ?? []).filter((id) => activeIds.has(id))
      return acc
    },
    { M: [], T: [], N: [] },
  )

  return { ...plan, columns, tasksByWorkerId, equipmentByWorkerId }
}

function findWorkerShift(columns: WeekPlan['columns'], workerId: number): Shift | null {
  for (const shift of SHIFTS) {
    if (columns[shift].includes(workerId)) return shift
  }
  return null
}

function loadCollapsedGroups(): Record<string, boolean> {
  const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, boolean>
  } catch {
    // ignore
  }
  return {}
}

function getGroupKey(shift: Shift, role: RoleCode) {
  return `${shift}-${role}`
}

function groupWorkerIdsByRole(
  workerIds: number[],
  workerById: Map<number, Worker>,
): Record<RoleCode, number[]> {
  const grouped: Record<RoleCode, number[]> = { AL: [], OG: [], JT: [] }
  workerIds.forEach((workerId) => {
    const role = workerById.get(workerId)?.roleCode as RoleCode | undefined
    if (role && ROLE_ORDER.includes(role)) grouped[role].push(workerId)
  })
  return grouped
}

function buildColumnFromGroups(groups: Record<RoleCode, number[]>) {
  return ROLE_ORDER.flatMap((role) => groups[role])
}

function getContractToneClass(worker: Worker) {
  if (worker.contract === 'Indefinido') return ' contract-indefinido'
  if (worker.contract === 'Plazo fijo') return ' contract-plazo'
  return ''
}

function formatWeekStartLabel(date: Date) {
  const dayName = DAY_NAMES[date.getUTCDay()] ?? ''
  const dayNumber = date.getUTCDate()
  const monthName = MONTH_NAMES[date.getUTCMonth()] ?? ''
  return `${dayName} ${dayNumber} de ${monthName}`
}

type WorkerCardProps = {
  worker: Worker
  taskOptions: Task[]
  taskValue: string | null
  onTaskChange: (workerId: number, taskId: string) => void
  equipmentOptions: { id: string; label: string; isUsed: boolean }[]
  equipmentValue: string | null
  onEquipmentChange: (workerId: number, equipmentId: string) => void
  isEquipmentDisabled?: boolean
  isReadOnly?: boolean
}

function WorkerCardContent({
  worker,
  taskOptions,
  taskValue,
  onTaskChange,
  equipmentOptions,
  equipmentValue,
  onEquipmentChange,
  isEquipmentDisabled = false,
  isReadOnly = false,
}: WorkerCardProps) {
  const allowedShifts = worker.constraints?.allowedShifts ?? []
  const hasShiftRestriction =
    allowedShifts.length > 0 && allowedShifts.length < SHIFTS.length
  const isFixedShift = allowedShifts.length === 1

  return (
    <>
      <div className="worker-card-top">
        <div className="worker-name">{getWorkerDisplayName(worker)}</div>
        <div className="worker-badges">
          {hasShiftRestriction ? (
            <span
              className="badge subtle"
              title={isFixedShift ? 'Turno fijo' : 'Turno restringido'}
            >
              <Lock size={12} />
            </span>
          ) : null}
        </div>
      </div>
      <div className="worker-task">
        <select
          value={taskValue ?? ''}
          onChange={(event) => onTaskChange(worker.id, event.target.value)}
          disabled={isReadOnly}
        >
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </div>
      <div className="worker-equipment">
        <select
          value={equipmentValue ?? ''}
          onChange={(event) => onEquipmentChange(worker.id, event.target.value)}
          disabled={isReadOnly || isEquipmentDisabled}
        >
          <option value="">(Sin equipo)</option>
          {equipmentOptions.map((equipment) => (
            <option key={equipment.id} value={equipment.id}>
              {equipment.label}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}

type SortableWorkerCardProps = {
  worker: Worker
  shift: Shift
  role: RoleCode
  taskOptions: Task[]
  taskValue: string | null
  onTaskChange: (workerId: number, taskId: string) => void
  equipmentOptions: { id: string; label: string; isUsed: boolean }[]
  equipmentValue: string | null
  onEquipmentChange: (workerId: number, equipmentId: string) => void
  isEquipmentDisabled?: boolean
}

function SortableWorkerCard({
  worker,
  shift,
  role,
  taskOptions,
  taskValue,
  onTaskChange,
  equipmentOptions,
  equipmentValue,
  onEquipmentChange,
  isEquipmentDisabled = false,
}: SortableWorkerCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: worker.id,
    data: { shift, role },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const contractClass = getContractToneClass(worker)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`worker-card${contractClass}${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <WorkerCardContent
        worker={worker}
        taskOptions={taskOptions}
        taskValue={taskValue}
        onTaskChange={onTaskChange}
        equipmentOptions={equipmentOptions}
        equipmentValue={equipmentValue}
        onEquipmentChange={onEquipmentChange}
        isEquipmentDisabled={isEquipmentDisabled}
      />
    </div>
  )
}

type ShiftColumnProps = {
  shift: Shift
  workerIds: number[]
  children: ReactNode
}

function ShiftColumn({ shift, workerIds, children }: ShiftColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${shift}`, data: { shift } })

  return (
    <div ref={setNodeRef} className={`shift-column${isOver ? ' over' : ''}`}>
      <div className="shift-column-header">
        <div>
          <strong>{SHIFT_LABEL[shift]}</strong>
        </div>
        <span className="shift-count">{workerIds.length}</span>
      </div>
      {children}
    </div>
  )
}

type RoleGroupProps = {
  shift: Shift
  role: RoleCode
  workerIds: number[]
  isCollapsed: boolean
  summaryLines: string[]
  onToggle: () => void
  children: ReactNode
}

function RoleGroup({
  shift,
  role,
  workerIds,
  isCollapsed,
  summaryLines,
  onToggle,
  children,
}: RoleGroupProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${shift}-${role}`,
    data: { shift, role },
  })

  return (
    <div className={`role-group${isOver ? ' over' : ''}`}>
      <div className="role-group-header">
        <div className="role-group-title">
          <span className={`badge role-${role.toLowerCase()}`}>{role}</span>
          <span className="role-count">{workerIds.length}</span>
        </div>
        <button type="button" className="role-toggle" onClick={onToggle}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          {isCollapsed ? 'Expandir' : 'Colapsar'}
        </button>
      </div>
      {isCollapsed ? (
        <div ref={setNodeRef} className={`role-dropzone${isOver ? ' over' : ''}`}>
          {summaryLines.length > 0 ? (
            <div className="role-summary">
              {summaryLines.map((line) => (
                <div key={line} className="role-summary-line">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <span className="role-summary-empty">Sin asignaciones</span>
          )}
        </div>
      ) : (
        <div ref={setNodeRef} className="role-group-body">
          {children}
        </div>
      )}
    </div>
  )
}

type PlanningPageProps = {
  weekNumber: number
  weekYear: number
  onWeekChange: (weekNumber: number, weekYear: number) => void
}

export function PlanningPage({
  weekNumber,
  weekYear,
  onWeekChange,
}: PlanningPageProps) {
  const [plan, setPlan] = useState<WeekPlan>(emptyPlan)
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [hasLoadedPlan, setHasLoadedPlan] = useState(false)
  const [hasLoadedRoster, setHasLoadedRoster] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    loadCollapsedGroups(),
  )
  const [activeId, setActiveId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    setTasks(getTasks())
    setWorkers(getWorkers())
    setEquipments(getEquipments())
    setHasLoadedRoster(true)
  }, [])

  const activeWorkers = useMemo(
    () => workers.filter((worker) => worker.isActive !== false),
    [workers],
  )

  const activeWorkerIds = useMemo(() => new Set(activeWorkers.map((worker) => worker.id)), [
    activeWorkers,
  ])

  const weekStartDate = useMemo(
    () => getWeekStartDate(weekNumber, weekYear),
    [weekNumber, weekYear],
  )

  const weekStart = useMemo(() => formatDate(weekStartDate), [weekStartDate])

  const weekLabel = useMemo(() => getWeekRangeLabel(weekNumber, weekYear), [weekNumber, weekYear])

  useEffect(() => {
    if (!hasLoadedRoster) return
    setHasLoadedPlan(false)
    const saved = loadWeekPlan(weekStart)
    if (!saved) {
      setPlan({ ...emptyPlan, weekStart })
      setHasLoadedPlan(true)
      return
    }
    setPlan(sanitizePlan({ ...saved, weekStart }, activeWorkerIds))
    setHasLoadedPlan(true)
  }, [weekStart, activeWorkerIds, hasLoadedRoster])

  const workerById = useMemo(
    () => new Map(activeWorkers.map((worker) => [worker.id, worker])),
    [activeWorkers],
  )

  const activeTasks = useMemo(() => tasks.filter((task) => task.isActive), [tasks])
  const taskNameById = useMemo(
    () => new Map(activeTasks.map((task) => [task.id, task.name])),
    [activeTasks],
  )
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const equipmentById = useMemo(
    () => new Map(equipments.map((equipment) => [equipment.id, equipment])),
    [equipments],
  )
  const visibleGroupKeys = useMemo(() => {
    const keys: string[] = []
    planningShiftOrder.forEach((shift) => {
      const grouped = groupWorkerIdsByRole(plan.columns[shift] ?? [], workerById)
      ROLE_ORDER.forEach((role) => {
        if (grouped[role].length > 0) keys.push(getGroupKey(shift, role))
      })
    })
    return keys
  }, [plan.columns, workerById])
  const hasCollapsedGroups = visibleGroupKeys.some((key) => collapsedGroups[key])

  const tasksByRole = useMemo(() => {
    const map = new Map<string, Task[]>()
    activeTasks.forEach((task) => {
      task.allowedRoleCodes.forEach((roleCode) => {
        const existing = map.get(roleCode) ?? []
        existing.push(task)
        map.set(roleCode, existing)
      })
    })
    return map
  }, [activeTasks])

  const defaultTaskByRole = useMemo(() => {
    const map = new Map<string, string>()
    tasksByRole.forEach((roleTasks, roleCode) => {
      if (roleTasks.length > 0) map.set(roleCode, roleTasks[0].id)
    })
    return map
  }, [tasksByRole])

  function getWorkerTaskName(workerId: number) {
    const worker = workerById.get(workerId)
    if (!worker) return null
    const taskId = plan.tasksByWorkerId[workerId] ?? defaultTaskByRole.get(worker.roleCode) ?? null
    if (!taskId) return null
    return taskNameById.get(taskId) ?? 'Sin tarea'
  }

  function getWorkerEquipmentSerie(workerId: number) {
    const equipmentId = plan.equipmentByWorkerId[workerId]
    if (!equipmentId) return ''
    return equipmentById.get(equipmentId)?.serie ?? ''
  }

  function getShiftExportRows(shift: Shift) {
    const workerIds = plan.columns[shift] ?? []
    const rows = workerIds
      .map((workerId) => {
        const worker = workerById.get(workerId)
        if (!worker) return null
        return {
          id: worker.id,
          name: getWorkerDisplayName(worker),
          role: worker.roleCode,
          task: getWorkerTaskName(workerId) ?? 'Sin tarea',
          equipment: getWorkerEquipmentSerie(workerId),
        }
      })
      .filter(
        (row): row is { id: number; name: string; role: string; task: string; equipment: string } =>
          row !== null,
      )

    rows.sort((a, b) => {
      const roleA = ROLE_ORDER_INDEX.get(a.role as RoleCode) ?? Number.MAX_SAFE_INTEGER
      const roleB = ROLE_ORDER_INDEX.get(b.role as RoleCode) ?? Number.MAX_SAFE_INTEGER
      if (roleA !== roleB) return roleA - roleB
      return a.name.localeCompare(b.name)
    })

    return rows
  }

  useEffect(() => {
    if (!hasLoadedPlan) return
    if (activeWorkers.length === 0 || defaultTaskByRole.size === 0) return
    const updates: Record<number, string | null> = {}
    const equipmentUpdates: Record<number, string | null> = {}
    let hasUpdates = false
    activeWorkers.forEach((worker) => {
      const currentTask = plan.tasksByWorkerId[worker.id]
      if (!currentTask) {
        const defaultTaskId = defaultTaskByRole.get(worker.roleCode)
        if (defaultTaskId) {
          updates[worker.id] = defaultTaskId
          hasUpdates = true
        }
      }
      if (!(worker.id in plan.equipmentByWorkerId)) {
        equipmentUpdates[worker.id] = null
        hasUpdates = true
      }
    })
    if (!hasUpdates) return
    persist({
      ...plan,
      tasksByWorkerId: {
        ...plan.tasksByWorkerId,
        ...updates,
      },
      equipmentByWorkerId: {
        ...plan.equipmentByWorkerId,
        ...equipmentUpdates,
      },
    })
  }, [activeWorkers, defaultTaskByRole, hasLoadedPlan, plan])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedGroups))
  }, [collapsedGroups])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timeout = window.setTimeout(() => setToastMessage(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [toastMessage])

  function persist(nextPlan: WeekPlan) {
    setPlan(nextPlan)
    saveWeekPlan(weekStart, nextPlan)
  }

  function handleSeed() {
    const currentStart = new Date(`${weekStart}T00:00:00Z`)
    currentStart.setUTCDate(currentStart.getUTCDate() - 7)
    const prevWeekStart = formatDate(currentStart)
    const prevWeekPlan = loadWeekPlan(prevWeekStart)
    const previousShifts = getShiftsByWorker(prevWeekPlan)
    const activeTaskIds = new Set(activeTasks.map((task) => task.id))
    const seeded = seedWeekPlan(weekStart, activeWorkers, previousShifts, activeTaskIds)
    const equipmentAssignments: Record<number, string | null> = {}
    SHIFTS.forEach((shift) => {
      const workerIds = seeded.columns[shift] ?? []
      const assigned = assignEquipmentsForShift({
        workerIds,
        tasksByWorkerId: seeded.tasksByWorkerId,
        equipments,
        taskById,
        workerById,
      })
      Object.assign(equipmentAssignments, assigned)
    })
    persist({
      ...seeded,
      equipmentByWorkerId: equipmentAssignments,
    })
    setToastMessage('Turno creado')
  }

  function handleSave() {
    saveWeekPlan(weekStart, plan)
  }

  function handleClear() {
    clearWeekPlan(weekStart)
    setPlan({ ...emptyPlan, weekStart })
  }

  function handleDownload() {
    const workbook = XLSX.utils.book_new()
    const weekCode = `S${String(weekNumber).padStart(2, '0')}`
    const subtitle = formatWeekStartLabel(weekStartDate)

    planningShiftOrder.forEach((shift) => {
      const shiftLabel = SHIFT_LABEL[shift]
      const title = `${shiftLabel.toUpperCase()} ${weekCode}`
      const rows = getShiftExportRows(shift)
      const data = [
        [title],
        [subtitle],
        [],
        ['ID', 'Nombre', 'Rol', 'Función', 'Equipo'],
        ...rows.map((row) => [row.id, row.name, row.role, row.task, row.equipment]),
      ]
      const sheet = XLSX.utils.aoa_to_sheet(data)
      sheet['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 8 }, { wch: 26 }, { wch: 16 }]
      const titleCell = sheet.A1
      if (titleCell) {
        titleCell.s = { font: { bold: true, sz: 14 } }
      }
      const headerCell = sheet.A4
      if (headerCell) {
        headerCell.s = { font: { bold: true } }
      }
      XLSX.utils.book_append_sheet(workbook, sheet, shiftLabel.toUpperCase())
    })

    const fileName = `ops-roster_${weekCode}_${weekYear}.xlsx`
    const content = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([content], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    window.URL.revokeObjectURL(url)
  }

  function handleTaskChange(workerId: number, taskId: string) {
    const shift = findWorkerShift(plan.columns, workerId)
    const worker = workerById.get(workerId)
    const requirement = getTaskEquipmentRequirement(taskId ? taskById.get(taskId) : undefined)
    const eligibleEquipments = worker
      ? getEligibleEquipments(requirement, worker.roleCode, equipments)
      : []
    const usedByOthers = new Set(
      (shift ? plan.columns[shift] ?? [] : [])
        .filter((id) => id !== workerId)
        .map((id) => plan.equipmentByWorkerId[id])
        .filter((id): id is string => Boolean(id)),
    )
    const currentEquipment = plan.equipmentByWorkerId[workerId] ?? null
    let nextEquipment: string | null = currentEquipment
    if (!requirement) {
      nextEquipment = null
    } else {
      const stillEligible =
        nextEquipment && eligibleEquipments.some((equipment) => equipment.id === nextEquipment)
      if (!stillEligible || (nextEquipment && usedByOthers.has(nextEquipment))) {
        nextEquipment =
          eligibleEquipments.find((equipment) => !usedByOthers.has(equipment.id))?.id ?? null
      }
    }
    const nextPlan: WeekPlan = {
      ...plan,
      tasksByWorkerId: {
        ...plan.tasksByWorkerId,
        [workerId]: taskId || null,
      },
      equipmentByWorkerId: {
        ...plan.equipmentByWorkerId,
        [workerId]: nextEquipment,
      },
    }
    persist(nextPlan)
  }

  function handleEquipmentChange(workerId: number, equipmentId: string, shift: Shift) {
    const normalized = equipmentId || null
    const nextEquipmentByWorkerId = {
      ...plan.equipmentByWorkerId,
      [workerId]: normalized,
    }
    if (normalized) {
      const workerIds = plan.columns[shift] ?? []
      workerIds.forEach((id) => {
        if (id !== workerId && plan.equipmentByWorkerId[id] === normalized) {
          nextEquipmentByWorkerId[id] = null
        }
      })
    }
    persist({
      ...plan,
      equipmentByWorkerId: nextEquipmentByWorkerId,
    })
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeId = active.id as number
    const overId = over.id
    const sourceShift =
      (active.data.current?.shift as Shift | undefined) ?? findWorkerShift(plan.columns, activeId)
    if (!sourceShift) return

    const worker = workerById.get(activeId)
    if (!worker) return
    const activeRole = worker.roleCode as RoleCode
    if (!ROLE_ORDER.includes(activeRole)) return
    const allowedShifts = allowedShiftsForWorker(worker)
    let targetShift: Shift | null = null
    let targetIndex = -1

    // Resolve drop target by group/column/worker for consistent cross-column moves.
    if (typeof overId === 'string') {
      if (overId.startsWith('group-')) {
        targetShift = over.data.current?.shift as Shift
        targetIndex = (plan.columns[targetShift] ?? []).length
      } else if (overId.startsWith('column-')) {
        targetShift = overId.replace('column-', '') as Shift
        targetIndex = (plan.columns[targetShift] ?? []).length
      }
    } else {
      const overWorkerId = overId as number
      targetShift =
        (over.data.current?.shift as Shift | undefined) ?? findWorkerShift(plan.columns, overWorkerId)
      if (!targetShift) return
      const overWorker = workerById.get(overWorkerId)
      if (overWorker?.roleCode === activeRole) {
        const targetGroup = groupWorkerIdsByRole(plan.columns[targetShift], workerById)[activeRole]
        targetIndex = targetGroup.indexOf(overWorkerId)
      }
    }

    if (!targetShift) return
    if (!allowedShifts.includes(targetShift)) return

    // Build role groups to keep ordering within the role while moving between shifts.
    const sourceGroups = groupWorkerIdsByRole(plan.columns[sourceShift], workerById)
    const targetGroups = groupWorkerIdsByRole(plan.columns[targetShift], workerById)
    const sourceGroup = sourceGroups[activeRole]
    const targetGroup = targetGroups[activeRole]

    const sourceIndex = sourceGroup.indexOf(activeId)
    if (sourceIndex === -1) return

    if (sourceShift === targetShift) {
      const maxIndex = targetGroup.length - 1
      const boundedIndex = targetIndex < 0 ? maxIndex : Math.max(0, Math.min(targetIndex, maxIndex))
      if (sourceIndex === boundedIndex) return
      sourceGroups[activeRole] = arrayMove(sourceGroup, sourceIndex, boundedIndex)
      persist({
        ...plan,
        columns: {
          ...plan.columns,
          [sourceShift]: buildColumnFromGroups(sourceGroups),
        },
      })
      return
    }

    sourceGroups[activeRole] = sourceGroup.filter((id) => id !== activeId)
    const insertIndex = targetIndex < 0 ? targetGroup.length : Math.min(targetIndex, targetGroup.length)
    const nextTargetGroup = [...targetGroup]
    nextTargetGroup.splice(insertIndex, 0, activeId)
    targetGroups[activeRole] = nextTargetGroup

    persist({
      ...plan,
      columns: {
        ...plan.columns,
        [sourceShift]: buildColumnFromGroups(sourceGroups),
        [targetShift]: buildColumnFromGroups(targetGroups),
      },
    })
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  function toggleGroupCollapse(shift: Shift, role: RoleCode) {
    const key = getGroupKey(shift, role)
    setCollapsedGroups((current) => ({ ...current, [key]: !current[key] }))
  }

  function handleWeekShift(direction: 'prev' | 'next') {
    const currentStart = getWeekStartDate(weekNumber, weekYear)
    const delta = direction === 'prev' ? -7 : 7
    const nextDate = new Date(currentStart)
    nextDate.setUTCDate(currentStart.getUTCDate() + delta)
    onWeekChange(getIsoWeekNumber(nextDate), getIsoWeekYear(nextDate))
  }

  function handleToggleAllGroups() {
    const shouldCollapse = !hasCollapsedGroups
    setCollapsedGroups((current) => {
      const next = { ...current }
      visibleGroupKeys.forEach((key) => {
        next[key] = shouldCollapse
      })
      return next
    })
  }

  return (
    <section>
      <div className="planning-controls">
        <div className="planning-week">
          <label className="field">
            Semana
            <input
              type="number"
              min={1}
              max={53}
              value={weekNumber}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) onWeekChange(value, weekYear)
              }}
            />
          </label>
          <label className="field">
            Año
            <input
              type="number"
              min={2000}
              max={2100}
              value={weekYear}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (!Number.isNaN(value)) onWeekChange(weekNumber, value)
              }}
            />
          </label>
          <div className="week-range">{weekLabel}</div>
        </div>
        <div className="planning-actions">
          <div className="button-row">
            <button
              type="button"
              className="icon-button"
              onClick={() => handleWeekShift('prev')}
              aria-label="Semana anterior"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => handleWeekShift('next')}
              aria-label="Semana siguiente"
            >
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="button-row">
            <button
              type="button"
              className="icon-button"
              onClick={handleSeed}
              aria-label="Generar turno"
            >
              <Rocket size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleDownload}
              aria-label="Descargar Excel"
            >
              <Download size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleSave}
              aria-label="Guardar turno"
            >
              <Save size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleClear}
              aria-label="Borrar turno"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handleToggleAllGroups}
              aria-label={hasCollapsedGroups ? 'Expandir grupos' : 'Colapsar grupos'}
              disabled={visibleGroupKeys.length === 0}
            >
              {hasCollapsedGroups ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        // rectIntersection keeps cross-column hit-testing stable for groups/columns.
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="planning-board">
          {planningShiftOrder.map((shift) => {
            const workerIds = plan.columns[shift] ?? []
            const grouped = groupWorkerIdsByRole(workerIds, workerById)
            const usedEquipmentIds = new Set(
              workerIds
                .map((id) => plan.equipmentByWorkerId[id])
                .filter((id): id is string => Boolean(id)),
            )
            return (
              <ShiftColumn key={shift} shift={shift} workerIds={workerIds}>
                <div className="shift-column-body" data-column={shift}>
                  {ROLE_ORDER.map((role) => {
                    const groupWorkerIds = grouped[role]
                    if (groupWorkerIds.length === 0) return null
                    const groupKey = getGroupKey(shift, role)
                    const isCollapsed = collapsedGroups[groupKey] ?? false
                    const taskCounts = new Map<string, number>()
                    groupWorkerIds.forEach((workerId) => {
                      const taskName = getWorkerTaskName(workerId) ?? 'Sin tarea'
                      taskCounts.set(taskName, (taskCounts.get(taskName) ?? 0) + 1)
                    })
                    const summaryLines = Array.from(taskCounts.entries())
                      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                      .map(([taskName, count]) => `${taskName}: ${count}`)
                    return (
                      <RoleGroup
                        key={groupKey}
                        shift={shift}
                        role={role}
                        workerIds={groupWorkerIds}
                        isCollapsed={isCollapsed}
                        summaryLines={summaryLines}
                        onToggle={() => toggleGroupCollapse(shift, role)}
                      >
                        <SortableContext
                          items={groupWorkerIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {groupWorkerIds.map((workerId) => {
                            const worker = workerById.get(workerId)
                            if (!worker) return null
                            const taskOptions = tasksByRole.get(worker.roleCode) ?? []
                            const taskValue =
                              plan.tasksByWorkerId[workerId] ??
                              defaultTaskByRole.get(worker.roleCode) ??
                              null
                            const requirement = getTaskEquipmentRequirement(
                              taskValue ? taskById.get(taskValue) : undefined,
                            )
                            const eligibleEquipments = getEligibleEquipments(
                              requirement,
                              worker.roleCode,
                              equipments,
                            )
                            const currentEquipment = plan.equipmentByWorkerId[workerId] ?? null
                            const equipmentOptions = eligibleEquipments.map((equipment) => {
                              const isUsed =
                                usedEquipmentIds.has(equipment.id) && equipment.id !== currentEquipment
                              return {
                                id: equipment.id,
                                label: `${isUsed ? '*' : ''}${equipment.serie}`,
                                isUsed,
                              }
                            })
                            return (
                              <SortableWorkerCard
                                key={workerId}
                                worker={worker}
                                shift={shift}
                                role={role}
                                taskOptions={taskOptions}
                                taskValue={taskValue}
                                onTaskChange={handleTaskChange}
                                equipmentOptions={equipmentOptions}
                                equipmentValue={currentEquipment}
                                onEquipmentChange={(id, value) =>
                                  handleEquipmentChange(id, value, shift)
                                }
                                isEquipmentDisabled={!requirement}
                              />
                            )
                          })}
                        </SortableContext>
                      </RoleGroup>
                    )
                  })}
                </div>
              </ShiftColumn>
            )
          })}
        </div>
        {/* DragOverlay renders outside layout to avoid clipping and follows the pointer offset. */}
        <DragOverlay>
          {activeId ? (
            <div
              className={`worker-card drag-overlay${(() => {
                const worker = workerById.get(activeId)
                return worker ? getContractToneClass(worker) : ''
              })()}`}
            >
              {(() => {
                const worker = workerById.get(activeId)
                if (!worker) return null
                const taskOptions = tasksByRole.get(worker.roleCode) ?? []
                const taskValue =
                  plan.tasksByWorkerId[activeId] ?? defaultTaskByRole.get(worker.roleCode) ?? null
                const requirement = getTaskEquipmentRequirement(
                  taskValue ? taskById.get(taskValue) : undefined,
                )
                const eligibleEquipments = getEligibleEquipments(
                  requirement,
                  worker.roleCode,
                  equipments,
                )
                const activeShift = findWorkerShift(plan.columns, activeId)
                const usedEquipmentIds = new Set(
                  (activeShift ? plan.columns[activeShift] ?? [] : [])
                    .filter((id) => id !== activeId)
                    .map((id) => plan.equipmentByWorkerId[id])
                    .filter((id): id is string => Boolean(id)),
                )
                const currentEquipment = plan.equipmentByWorkerId[activeId] ?? null
                const equipmentOptions = eligibleEquipments.map((equipment) => ({
                  id: equipment.id,
                  label: `${usedEquipmentIds.has(equipment.id) && equipment.id !== currentEquipment ? '*' : ''}${equipment.serie}`,
                  isUsed: usedEquipmentIds.has(equipment.id) && equipment.id !== currentEquipment,
                }))
                return (
                  <WorkerCardContent
                    worker={worker}
                    taskOptions={taskOptions}
                    taskValue={taskValue}
                    onTaskChange={handleTaskChange}
                    equipmentOptions={equipmentOptions}
                    equipmentValue={currentEquipment}
                    onEquipmentChange={() => {}}
                    isEquipmentDisabled={!requirement}
                    isReadOnly
                  />
                )
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {toastMessage ? <div className="toast">{toastMessage}</div> : null}
    </section>
  )
}
