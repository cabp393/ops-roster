import type { Assignment, PlanningInput, Shift } from '../types'
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

function chooseShiftByTargets(
  allowed: Shift[] | undefined,
  roleCode: string,
  countsByShift: Record<Shift, number>,
  countsByShiftRole: Record<Shift, Record<string, number>>,
  restrictions?: PlanningInput['restrictions'],
): Shift {
  const candidates = allowed?.length ? allowed : SHIFTS
  if (!restrictions) {
    return chooseBalancedShift(allowed, countsByShift)
  }

  const scoreForShift = (shift: Shift) => {
    const roleTarget = restrictions.demand.shifts[shift]?.roleTargets?.[roleCode]
    if (!roleTarget) return { score: 0, shift }
    const current = countsByShiftRole[shift]?.[roleCode] ?? 0
    if (current < roleTarget.min) return { score: 1000 + (roleTarget.min - current), shift }
    if (current < roleTarget.target) return { score: 500 + (roleTarget.target - current), shift }
    if (current >= roleTarget.max) return { score: -1000 - (current - roleTarget.max), shift }
    return { score: 100 - Math.abs(roleTarget.target - current), shift }
  }

  const scored = [...candidates]
    .map((shift) => ({
      ...scoreForShift(shift),
      balance: countsByShift[shift],
      priorityIndex: SHIFT_PRIORITY.indexOf(shift),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score
      if (a.balance !== b.balance) return a.balance - b.balance
      return a.priorityIndex - b.priorityIndex
    })

  return scored[0]?.shift ?? chooseBalancedShift(allowed, countsByShift)
}

export function generateAssignments({
  weekStart,
  workers,
  prevWeekShifts,
  roles,
  restrictions,
}: PlanningInput): Assignment[] {
  const assignments: Assignment[] = []
  const counts: Record<Shift, number> = { M: 0, T: 0, N: 0 }
  const countsByRole: Record<Shift, Record<string, number>> = { M: {}, T: {}, N: {} }
  const roleByCode = new Map(roles.map((role) => [role.code, role]))

  const activeWorkers = workers.filter((worker) => worker.isActive !== false)
  const plazoFijoWorkers = activeWorkers.filter((worker) => worker.contract === 'Plazo fijo')
  const fixedOrIndefinido = activeWorkers.filter((worker) => worker.contract === 'Indefinido')

  const incrementCounts = (shift: Shift, roleCode: string) => {
    const role = roleByCode.get(roleCode)
    if (role?.countsForBalance !== false) {
      counts[shift] += 1
    }
    countsByRole[shift][roleCode] = (countsByRole[shift][roleCode] ?? 0) + 1
  }

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
    incrementCounts(shift, worker.roleCode)
  })

  plazoFijoWorkers.forEach((worker) => {
    const allowed = worker.constraints?.allowedShifts
    const shift =
      restrictions && restrictions.policies.balanceByRole
        ? chooseShiftByTargets(allowed, worker.roleCode, counts, countsByRole, restrictions)
        : chooseBalancedShift(allowed, counts)

    assignments.push({
      workerId: worker.id,
      weekStart,
      shift,
      source: 'generated',
    })
    incrementCounts(shift, worker.roleCode)
  })

  return assignments
}
