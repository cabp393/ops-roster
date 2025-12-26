import type { Assignment, PlanningInput, Shift } from './types'
import { SHIFTS } from '../data/mock'
import { rotateStable } from './rotation'

const SHIFT_PRIORITY: Shift[] = ['M', 'T', 'N']

function ensureAllowedShift(
  preferred: Shift,
  allowed: Shift[] | undefined,
  counts: Record<Shift, number>,
): Shift {
  if (!allowed || allowed.includes(preferred)) {
    return preferred
  }

  const sortedAllowed = [...allowed].sort((a, b) => {
    if (counts[a] !== counts[b]) return counts[a] - counts[b]
    return SHIFT_PRIORITY.indexOf(a) - SHIFT_PRIORITY.indexOf(b)
  })

  return sortedAllowed[0] ?? preferred
}

function chooseBalancedShift(allowed: Shift[] | undefined, counts: Record<Shift, number>): Shift {
  const candidates = allowed?.length ? allowed : SHIFTS
  return [...candidates].sort((a, b) => {
    if (counts[a] !== counts[b]) return counts[a] - counts[b]
    return SHIFT_PRIORITY.indexOf(a) - SHIFT_PRIORITY.indexOf(b)
  })[0]
}

export function generateAssignments({ weekStart, workers, prevWeekShifts }: PlanningInput): Assignment[] {
  const assignments: Assignment[] = []
  const counts: Record<Shift, number> = { M: 0, T: 0, N: 0 }

  const plazoFijoWorkers = workers.filter((worker) => worker.contract === 'Plazo fijo')
  const fixedOrIndefinido = workers.filter((worker) => worker.contract === 'Indefinido')

  fixedOrIndefinido.forEach((worker) => {
    let shift: Shift
    if (worker.shiftMode === 'Fijo' && worker.fixedShift) {
      shift = worker.fixedShift
    } else {
      const previousShift = prevWeekShifts[worker.id]
      shift = previousShift ? rotateStable(previousShift) : 'M'
    }

    shift = ensureAllowedShift(shift, worker.constraints?.allowedShifts, counts)

    assignments.push({
      workerId: worker.id,
      weekStart,
      shift,
      source: 'generated',
    })
    counts[shift] += 1
  })

  plazoFijoWorkers.forEach((worker) => {
    const allowed = worker.constraints?.allowedShifts
    const shift = chooseBalancedShift(allowed, counts)

    assignments.push({
      workerId: worker.id,
      weekStart,
      shift,
      source: 'generated',
    })
    counts[shift] += 1
  })

  return assignments
}
