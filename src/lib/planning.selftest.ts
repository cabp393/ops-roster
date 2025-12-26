import { prevWeekShifts, workers } from '../data/mock'
import { generateWeekPlan } from './planning'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function findAssignment(workerId: number, assignments: { workerId: number; shift: string }[]) {
  return assignments.find((assignment) => assignment.workerId === workerId)
}

function runScenarioOne() {
  const plan = generateWeekPlan({
    weekStart: '2025-12-22',
    workers,
    prevWeekShifts,
  })

  workers.forEach((worker) => {
    const assignment = findAssignment(worker.id, plan.assignments)
    assert(Boolean(assignment), `S1: Missing assignment for worker ${worker.id}.`)
    if (!assignment) return

    if (worker.shiftMode === 'Fijo' && worker.fixedShift) {
      assert(
        assignment.shift === worker.fixedShift,
        `S1: Fixed shift mismatch for ${worker.name}.`,
      )
    }

    const allowed = worker.constraints?.allowedShifts
    if (allowed?.length) {
      assert(
        allowed.includes(assignment.shift as never),
        `S1: Constraint violation for ${worker.name}.`,
      )
    }
  })

  console.log('S1 OK')
}

function runScenarioTwo() {
  const plan = generateWeekPlan({
    weekStart: '2025-12-29',
    workers,
    prevWeekShifts,
  })

  const assignment1 = findAssignment(1, plan.assignments)
  const assignment2 = findAssignment(2, plan.assignments)
  const assignment6 = findAssignment(6, plan.assignments)
  const assignment10 = findAssignment(10, plan.assignments)

  assert(assignment1?.shift === 'T', 'S2: Worker 1 should rotate N -> T.')
  assert(assignment2?.shift === 'M', 'S2: Worker 2 should rotate T -> M.')
  assert(assignment6?.shift === 'N', 'S2: Worker 6 should rotate M -> N.')
  assert(
    assignment10 && ['M', 'N'].includes(assignment10.shift),
    'S2: Worker 10 should stay within allowed shifts.',
  )
  assert(
    plan.warnings.some((warning) => warning.includes('Sofía Lagos') && warning.includes('Rotation')),
    'S2: Expected warning for worker 10 rotation constraint.',
  )

  console.log('S2 OK')
}

function runScenarioThree() {
  const plan = generateWeekPlan({
    weekStart: '2025-12-29',
    workers,
    prevWeekShifts,
  })

  Object.entries(plan.stats.perGroup).forEach(([group, counts]) => {
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    assert(total > 0, `S3: Expected counts for group ${group}.`)
  })

  console.log('S3 OK', plan.stats)
}

function runSelfTests() {
  try {
    runScenarioOne()
    runScenarioTwo()
    runScenarioThree()
    console.log('planning.selftest OK')
  } catch (error) {
    console.error('planning.selftest failed:', error)
  }
}

if (import.meta.env.DEV) {
  runSelfTests()
}
