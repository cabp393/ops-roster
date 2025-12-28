import type { Worker } from '../types'

type ParsedName = {
  firstName: string
  secondName?: string
  lastName: string
  motherLastName?: string
}

export function parseLegacyName(name: string): ParsedName {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', secondName: '', lastName: '', motherLastName: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], secondName: '', lastName: '', motherLastName: '' }
  }
  if (parts.length === 2) {
    return { firstName: parts[0], secondName: '', lastName: parts[1], motherLastName: '' }
  }
  if (parts.length === 3) {
    return { firstName: parts[0], secondName: '', lastName: parts[1], motherLastName: parts[2] }
  }
  return {
    firstName: parts[0],
    secondName: parts.slice(1, parts.length - 2).join(' '),
    lastName: parts[parts.length - 2],
    motherLastName: parts[parts.length - 1],
  }
}

export function getWorkerFullName(worker: Worker): string {
  const nameParts = [worker.firstName, worker.secondName, worker.lastName, worker.motherLastName]
    .map((part) => part?.trim())
    .filter(Boolean)
  const fullName = nameParts.join(' ').trim()
  return fullName || worker.name?.trim() || ''
}

export function getWorkerDisplayName(worker: Worker): string {
  const givenNames = [worker.firstName, worker.secondName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
  const lastNames = [worker.lastName, worker.motherLastName]
    .map((part) => part?.trim())
    .filter(Boolean)
  const initials = lastNames
    .map((name) => (name ? name[0]?.toUpperCase() : ''))
    .filter(Boolean)
    .join('')
  const legacyParsed = !initials && worker.name ? parseLegacyName(worker.name) : null
  const fallbackInitials = legacyParsed
    ? [legacyParsed.lastName, legacyParsed.motherLastName]
        .filter(Boolean)
        .map((name) => name[0]?.toUpperCase())
        .join('')
    : ''
  const baseName = givenNames || worker.name?.trim() || ''
  const combined = [baseName, initials || fallbackInitials].filter(Boolean).join(' ').trim()
  const lastNameLabel = lastNames.join(' ').trim()
  if (!combined) return ''
  return lastNameLabel ? `${combined} (${lastNameLabel})` : combined
}

export function getWorkerLastNames(worker: Worker): string {
  return [worker.lastName, worker.motherLastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}
