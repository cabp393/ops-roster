import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, ArrowRight, Eye, Lock, RotateCw, Save, Trash2 } from 'lucide-react'
import { SHIFT_LABEL, SHIFTS, prevWeekShifts } from '../data/mock'
import { clearWeekPlan, loadWeekPlan, saveWeekPlan, seedWeekPlan } from '../lib/planningBoard'
import {
  formatDate,
  getIsoWeekNumber,
  getIsoWeekYear,
  getWeekRangeLabel,
  getWeekStartDate,
} from '../lib/week'
import { getTasks, getWorkers } from '../lib/storage'
import { getWorkerDisplayName } from '../lib/workerName'
import type { Shift, Task, WeekPlan, Worker } from '../types'

const emptyPlan: WeekPlan = {
  weekStart: '2025-12-29',
  columns: { M: [], T: [], N: [] },
  tasksByWorkerId: {},
}

const planningShiftOrder: Shift[] = ['N', 'M', 'T']

function allowedShiftsForWorker(worker: Worker): Shift[] {
  if (worker.shiftMode === 'Fijo' && worker.fixedShift) return [worker.fixedShift]
  return worker.constraints?.allowedShifts ?? SHIFTS
}

function sanitizePlan(plan: WeekPlan, activeIds: Set<number>): WeekPlan {
  const tasksByWorkerId: Record<number, string | null> = {}
  Object.entries(plan.tasksByWorkerId).forEach(([key, value]) => {
    const id = Number(key)
    if (Number.isNaN(id) || !activeIds.has(id)) return
    tasksByWorkerId[id] = value
  })

  const columns = SHIFTS.reduce<Record<Shift, number[]>>(
    (acc, shift) => {
      acc[shift] = (plan.columns[shift] ?? []).filter((id) => activeIds.has(id))
      return acc
    },
    { M: [], T: [], N: [] },
  )

  return { ...plan, columns, tasksByWorkerId }
}

function findWorkerShift(columns: WeekPlan['columns'], workerId: number): Shift | null {
  for (const shift of SHIFTS) {
    if (columns[shift].includes(workerId)) return shift
  }
  return null
}

type WorkerCardProps = {
  worker: Worker
  shift: Shift
  taskOptions: Task[]
  taskValue: string | null
  onTaskChange: (workerId: number, taskId: string) => void
}

function WorkerCard({ worker, shift, taskOptions, taskValue, onTaskChange }: WorkerCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: worker.id,
    data: { shift },
  })

  const hasShiftRestriction =
    worker.shiftMode === 'Fijo' ||
    (worker.constraints?.allowedShifts &&
      worker.constraints.allowedShifts.length > 0 &&
      worker.constraints.allowedShifts.length < SHIFTS.length)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`worker-card${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="worker-card-top">
        <div className="worker-name">{getWorkerDisplayName(worker)}</div>
        <div className="worker-badges">
          <span className={`badge role-${worker.roleCode.toLowerCase()}`}>{worker.roleCode}</span>
          {worker.contract ? (
            <span
              className={`badge contract-${worker.contract === 'Indefinido' ? 'indefinido' : 'plazo'}`}
            >
              {worker.contract}
            </span>
          ) : null}
          {hasShiftRestriction ? (
            <span
              className="badge subtle"
              title={worker.shiftMode === 'Fijo' ? 'Turno fijo' : 'Turno restringido'}
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
        >
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </div>
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

type PlanningPageProps = {
  weekNumber: number
  weekYear: number
  onWeekChange: (weekNumber: number, weekYear: number) => void
  onGoToSummary: () => void
}

export function PlanningPage({
  weekNumber,
  weekYear,
  onWeekChange,
  onGoToSummary,
}: PlanningPageProps) {
  const [plan, setPlan] = useState<WeekPlan>(emptyPlan)
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [hasLoadedPlan, setHasLoadedPlan] = useState(false)
  const [hasLoadedRoster, setHasLoadedRoster] = useState(false)

  useEffect(() => {
    setTasks(getTasks())
    setWorkers(getWorkers())
    setHasLoadedRoster(true)
  }, [])

  const activeWorkers = useMemo(
    () => workers.filter((worker) => worker.isActive !== false),
    [workers],
  )

  const activeWorkerIds = useMemo(() => new Set(activeWorkers.map((worker) => worker.id)), [
    activeWorkers,
  ])

  const weekStart = useMemo(() => {
    const startDate = getWeekStartDate(weekNumber, weekYear)
    return formatDate(startDate)
  }, [weekNumber, weekYear])

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

  useEffect(() => {
    if (!hasLoadedPlan) return
    if (activeWorkers.length === 0 || defaultTaskByRole.size === 0) return
    const updates: Record<number, string | null> = {}
    let hasUpdates = false
    activeWorkers.forEach((worker) => {
      const currentTask = plan.tasksByWorkerId[worker.id]
      if (currentTask) return
      const defaultTaskId = defaultTaskByRole.get(worker.roleCode)
      if (!defaultTaskId) return
      updates[worker.id] = defaultTaskId
      hasUpdates = true
    })
    if (!hasUpdates) return
    persist({
      ...plan,
      tasksByWorkerId: {
        ...plan.tasksByWorkerId,
        ...updates,
      },
    })
  }, [activeWorkers, defaultTaskByRole, hasLoadedPlan, plan])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function persist(nextPlan: WeekPlan) {
    setPlan(nextPlan)
    saveWeekPlan(weekStart, nextPlan)
  }

  function handleSeed() {
    const seeded = seedWeekPlan(weekStart, activeWorkers, prevWeekShifts)
    persist(seeded)
  }

  function handleSave() {
    saveWeekPlan(weekStart, plan)
  }

  function handleClear() {
    clearWeekPlan(weekStart)
    setPlan({ ...emptyPlan, weekStart })
  }

  function handleTaskChange(workerId: number, taskId: string) {
    const nextPlan: WeekPlan = {
      ...plan,
      tasksByWorkerId: {
        ...plan.tasksByWorkerId,
        [workerId]: taskId || null,
      },
    }
    persist(nextPlan)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as number
    const overId = over.id
    const sourceShift = (active.data.current?.shift as Shift | undefined) ?? findWorkerShift(plan.columns, activeId)
    if (!sourceShift) return

    let targetShift: Shift | null = null
    let targetIndex = -1

    if (typeof overId === 'string' && overId.startsWith('column-')) {
      targetShift = overId.replace('column-', '') as Shift
      targetIndex = plan.columns[targetShift]?.length ?? 0
    } else {
      const overWorkerId = overId as number
      targetShift =
        (over.data.current?.shift as Shift | undefined) ?? findWorkerShift(plan.columns, overWorkerId)
      if (!targetShift) return
      targetIndex = plan.columns[targetShift].indexOf(overWorkerId)
    }

    if (!targetShift) return

    const worker = workerById.get(activeId)
    if (!worker) return
    const allowedShifts = allowedShiftsForWorker(worker)
    if (!allowedShifts.includes(targetShift)) return

    if (sourceShift === targetShift) {
      const sourceIndex = plan.columns[sourceShift].indexOf(activeId)
      if (sourceIndex === -1) return
      const maxIndex = plan.columns[sourceShift].length - 1
      const boundedIndex = targetIndex < 0 ? maxIndex : Math.max(0, Math.min(targetIndex, maxIndex))
      if (sourceIndex === boundedIndex) return
      const reordered = arrayMove(plan.columns[sourceShift], sourceIndex, boundedIndex)
      persist({
        ...plan,
        columns: {
          ...plan.columns,
          [sourceShift]: reordered,
        },
      })
      return
    }

    const sourceItems = [...plan.columns[sourceShift]]
    const targetItems = [...plan.columns[targetShift]]
    const sourceIndex = sourceItems.indexOf(activeId)
    if (sourceIndex === -1) return
    sourceItems.splice(sourceIndex, 1)
    const insertIndex = targetIndex < 0 ? targetItems.length : targetIndex
    targetItems.splice(insertIndex, 0, activeId)

    persist({
      ...plan,
      columns: {
        ...plan.columns,
        [sourceShift]: sourceItems,
        [targetShift]: targetItems,
      },
    })
  }

  function handleWeekShift(direction: 'prev' | 'next') {
    const currentStart = getWeekStartDate(weekNumber, weekYear)
    const delta = direction === 'prev' ? -7 : 7
    const nextDate = new Date(currentStart)
    nextDate.setUTCDate(currentStart.getUTCDate() + delta)
    onWeekChange(getIsoWeekNumber(nextDate), getIsoWeekYear(nextDate))
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
              <RotateCw size={14} />
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
              onClick={onGoToSummary}
              aria-label="Ver resumen"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="planning-board">
          {planningShiftOrder.map((shift) => {
            const workerIds = plan.columns[shift] ?? []
            return (
              <ShiftColumn key={shift} shift={shift} workerIds={workerIds}>
                <SortableContext items={workerIds} strategy={verticalListSortingStrategy}>
                  <div className="shift-column-body" data-column={shift}>
                    {workerIds.map((workerId) => {
                      const worker = workerById.get(workerId)
                      if (!worker) return null
                      const taskOptions = tasksByRole.get(worker.roleCode) ?? []
                      const taskValue =
                        plan.tasksByWorkerId[workerId] ??
                        defaultTaskByRole.get(worker.roleCode) ??
                        null
                      return (
                        <WorkerCard
                          key={workerId}
                          worker={worker}
                          shift={shift}
                          taskOptions={taskOptions}
                          taskValue={taskValue}
                          onTaskChange={handleTaskChange}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </ShiftColumn>
            )
          })}
        </div>
      </DndContext>
    </section>
  )
}
