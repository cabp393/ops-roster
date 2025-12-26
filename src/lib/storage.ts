import type { PlanningRecord } from './types'

const STORAGE_PREFIX = 'opsRoster:planning'

function storageKey(weekStart: string) {
  return `${STORAGE_PREFIX}:${weekStart}`
}

export function loadPlanning(weekStart: string): PlanningRecord | null {
  const raw = localStorage.getItem(storageKey(weekStart))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PlanningRecord
    if (!parsed || parsed.weekStart !== weekStart || !Array.isArray(parsed.assignments)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function savePlanning(weekStart: string, record: PlanningRecord) {
  localStorage.setItem(storageKey(weekStart), JSON.stringify(record))
}

export function clearPlanning(weekStart: string) {
  localStorage.removeItem(storageKey(weekStart))
}
