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
  const fixedShiftWorkers = activeWorkers.filter((worker) => worker.shiftMode === 'Fijo')
  const indefinidoRotativo = activeWorkers.filter(
    (worker) => worker.contract === 'Indefinido' && worker.shiftMode === 'Rotativo',
  )
  const plazoFijoRotativo = activeWorkers.filter(
    (worker) => worker.contract === 'Plazo fijo' && worker.shiftMode === 'Rotativo',
  )

  const incrementCounts = (shift: Shift, roleCode: string) => {
    const role = roleByCode.get(roleCode)
    if (role?.countsForBalance !== false) {
      counts[shift] += 1
    }
    countsByRole[shift][roleCode] = (countsByRole[shift][roleCode] ?? 0) + 1
  }

  const chooseShiftForMissingHistory = (worker: { roleCode: string; constraints?: { allowedShifts?: Shift[] } }) =>
    restrictions && restrictions.policies.balanceByRole
      ? chooseShiftByTargets(worker.constraints?.allowedShifts, worker.roleCode, counts, countsByRole, restrictions)
      : chooseBalancedShift(worker.constraints?.allowedShifts, counts)

  const assignWorker = (worker: { id: number; roleCode: string }, shift: Shift) => {
    assignments.push({
      workerId: worker.id,
      weekStart,
      shift,
      source: 'generated',
    })
    incrementCounts(shift, worker.roleCode)
  }

  // 1) Fixed shifts first (hard rule).
  fixedShiftWorkers.forEach((worker) => {
    const shift = worker.fixedShift ?? chooseShiftForMissingHistory(worker)
    assignWorker(worker, shift)
  })

  // 2) Stable rotation for indefinido rotativo (hard rule).
  indefinidoRotativo.forEach((worker) => {
    const previousShift = prevWeekShifts[worker.id]
    const shift = previousShift ? rotateStable(previousShift) : chooseShiftForMissingHistory(worker)
    assignWorker(worker, shift)
  })

  // 3) Flexible assignment for plazo fijo rotativo (balancing).
  plazoFijoRotativo.forEach((worker) => {
    const allowed = worker.constraints?.allowedShifts
    const shift =
      restrictions && restrictions.policies.balanceByRole
        ? chooseShiftByTargets(allowed, worker.roleCode, counts, countsByRole, restrictions)
        : chooseBalancedShift(allowed, counts)

    assignWorker(worker, shift)
  })

  // 5) Validation phase: surface warnings instead of failing.
  const warnings: string[] = []
  const workerById = new Map(activeWorkers.map((worker) => [worker.id, worker]))
  const countsByShiftRole = assignments.reduce<Record<Shift, Record<string, number>>>(
    (acc, assignment) => {
      const roleCode = workerById.get(assignment.workerId)?.roleCode
      if (!roleCode) return acc
      acc[assignment.shift][roleCode] = (acc[assignment.shift][roleCode] ?? 0) + 1
      return acc
    },
    { M: {}, T: {}, N: {} },
  )

  let fixedViolations = 0
  let rotationViolations = 0
  let constraintViolations = 0

  assignments.forEach((assignment) => {
    const worker = workerById.get(assignment.workerId)
    if (!worker) return
    if (worker.shiftMode === 'Fijo' && worker.fixedShift && assignment.shift !== worker.fixedShift) {
      fixedViolations += 1
    }
    if (worker.contract === 'Indefinido' && worker.shiftMode === 'Rotativo') {
      const previousShift = prevWeekShifts[worker.id]
      if (previousShift && assignment.shift !== rotateStable(previousShift)) {
        rotationViolations += 1
      }
    }
    const allowed = worker.constraints?.allowedShifts
    if (allowed && !allowed.includes(assignment.shift)) {
      constraintViolations += 1
    }
  })

  if (fixedViolations > 0) {
    warnings.push(`Fixed shift violations: ${fixedViolations}.`)
  }
  if (rotationViolations > 0) {
    warnings.push(`Stable rotation violations: ${rotationViolations}.`)
  }
  if (constraintViolations > 0) {
    warnings.push(`Constraint violations: ${constraintViolations}.`)
  }

  if (restrictions) {
    const unmetTargets: string[] = []
    SHIFTS.forEach((shift) => {
      const roleTargets = restrictions.demand.shifts[shift]?.roleTargets ?? {}
      Object.entries(roleTargets).forEach(([roleCode, target]) => {
        const current = countsByShiftRole[shift][roleCode] ?? 0
        if (current < target.min) {
          unmetTargets.push(`${shift}/${roleCode} (${current}/${target.min})`)
        }
      })
    })
    if (unmetTargets.length > 0) {
      warnings.push(`Unmet demand targets: ${unmetTargets.join(', ')}.`)
    }
  }

  if (warnings.length > 0) {
    console.warn('Planning validation warnings:', warnings)
  }

  return assignments
}
