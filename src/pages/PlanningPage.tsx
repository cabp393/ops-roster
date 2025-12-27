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
import { SHIFT_LABEL, SHIFTS, prevWeekShifts } from '../data/mock'
import { clearWeekPlan, loadWeekPlan, saveWeekPlan, seedWeekPlan } from '../lib/planningBoard'
import { getTasks, getWorkers } from '../lib/storage'
import type { Shift, Task, WeekPlan, Worker } from '../types'

const fallbackWeekStart = '2025-12-29'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultWeekStart() {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const offset = (dayOfWeek + 6) % 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - offset)
    return toDateInputValue(monday)
  } catch {
    return fallbackWeekStart
  }
}

const emptyPlan: WeekPlan = {
  weekStart: fallbackWeekStart,
  columns: { M: [], T: [], N: [] },
  tasksByWorkerId: {},
}

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
  taskOptions: Task[]
  taskValue: string | null
  onTaskChange: (workerId: number, taskId: string) => void
}

function WorkerCard({ worker, taskOptions, taskValue, onTaskChange }: WorkerCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: worker.id,
  })

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
      <div className="worker-card-header">
        <div>
          <div className="worker-name">{worker.name}</div>
          <div className="worker-badges">
            <span className="badge">{worker.roleCode}</span>
            {worker.contract ? <span className="badge subtle">{worker.contract}</span> : null}
          </div>
        </div>
      </div>
      <label className="field worker-task">
        Task
        <select
          value={taskValue ?? ''}
          onChange={(event) => onTaskChange(worker.id, event.target.value)}
        >
          <option value="">Unassigned</option>
          {taskOptions.map((task) => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

type ShiftColumnProps = {
  shift: Shift
  workerIds: number[]
  children: ReactNode
}

function ShiftColumn({ shift, workerIds, children }: ShiftColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${shift}` })

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

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [plan, setPlan] = useState<WeekPlan>(emptyPlan)
  const [tasks, setTasks] = useState<Task[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])

  useEffect(() => {
    setTasks(getTasks())
    setWorkers(getWorkers())
  }, [])

  const activeWorkers = useMemo(
    () => workers.filter((worker) => worker.isActive !== false),
    [workers],
  )

  const activeWorkerIds = useMemo(() => new Set(activeWorkers.map((worker) => worker.id)), [
    activeWorkers,
  ])

  useEffect(() => {
    const saved = loadWeekPlan(weekStart)
    if (!saved) {
      setPlan({ ...emptyPlan, weekStart })
      return
    }
    setPlan(sanitizePlan({ ...saved, weekStart }, activeWorkerIds))
  }, [weekStart, activeWorkerIds])

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function persist(nextPlan: WeekPlan) {
    setPlan(nextPlan)
    saveWeekPlan(weekStart, nextPlan)
  }

  function handleSeed() {
    const seeded = seedWeekPlan(weekStart, activeWorkers, prevWeekShifts)
    persist(seeded)
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
    const sourceShift = findWorkerShift(plan.columns, activeId)
    if (!sourceShift) return

    let targetShift: Shift | null = null
    let targetIndex = -1

    if (typeof overId === 'string' && overId.startsWith('column-')) {
      targetShift = overId.replace('column-', '') as Shift
      targetIndex = plan.columns[targetShift]?.length ?? 0
    } else {
      const overWorkerId = overId as number
      targetShift = findWorkerShift(plan.columns, overWorkerId)
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
      const boundedIndex = Math.max(0, Math.min(targetIndex, maxIndex))
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

  return (
    <section>
      <div className="planning-controls">
        <label className="field">
          Week start
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>
        <div className="button-row">
          <button type="button" onClick={handleSeed}>
            Seed week
          </button>
          <button type="button" onClick={handleClear}>
            Clear week
          </button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="planning-board">
          {SHIFTS.map((shift) => {
            const workerIds = plan.columns[shift] ?? []
            return (
              <ShiftColumn key={shift} shift={shift} workerIds={workerIds}>
                <SortableContext items={workerIds} strategy={verticalListSortingStrategy}>
                  <div className="shift-column-body" data-column={shift}>
                    {workerIds.map((workerId) => {
                      const worker = workerById.get(workerId)
                      if (!worker) return null
                      const taskOptions = tasksByRole.get(worker.roleCode) ?? []
                      const taskValue = plan.tasksByWorkerId[workerId] ?? null
                      return (
                        <WorkerCard
                          key={workerId}
                          worker={worker}
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
