import type { Shift } from '../data/mock'

export function rotateStable(prev: Shift): Shift {
  if (prev === 'N') return 'T'
  if (prev === 'T') return 'M'
  return 'N'
}
