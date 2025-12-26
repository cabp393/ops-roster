import type { Assignment } from './types'

const STORAGE_PREFIX = 'opsRoster:planning'

function storageKey(weekStart: string) {
  return `${STORAGE_PREFIX}:${weekStart}`
}

export function loadPlanning(weekStart: string): Assignment[] | null {
  const raw = localStorage.getItem(storageKey(weekStart))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Assignment[]
    return parsed
  } catch {
    return null
  }
}

export function savePlanning(weekStart: string, assignments: Assignment[]) {
  localStorage.setItem(storageKey(weekStart), JSON.stringify(assignments))
}

export function clearPlanning(weekStart: string) {
  localStorage.removeItem(storageKey(weekStart))
}
