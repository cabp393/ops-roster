export type Shift = 'M' | 'T' | 'N'

export const SHIFTS: Shift[] = ['M', 'T', 'N']

export const SHIFT_LABEL: Record<Shift, string> = {
  M: 'Mañana',
  T: 'Tarde',
  N: 'Noche',
}

export type Worker = {
  id: number
  name: string
  group: 'Gruero' | 'Auxiliar'
  contract: 'Indefinido' | 'Plazo fijo'
  shiftMode: 'Rotativo' | 'Fijo'
  fixedShift?: Shift
  constraints?: {
    allowedShifts?: Shift[]
  }
  specialRole?: string
}

export const workers: Worker[] = [
  { id: 1, name: 'Cristian Soto', group: 'Gruero', contract: 'Indefinido', shiftMode: 'Rotativo' },
  { id: 2, name: 'Matías Rojas', group: 'Gruero', contract: 'Indefinido', shiftMode: 'Rotativo', constraints: { allowedShifts: ['M', 'T'] } },
  { id: 3, name: 'Felipe Muñoz', group: 'Gruero', contract: 'Indefinido', shiftMode: 'Fijo', fixedShift: 'N' },
  { id: 4, name: 'Diego Herrera', group: 'Gruero', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 5, name: 'Sebastián Vidal', group: 'Gruero', contract: 'Plazo fijo', shiftMode: 'Rotativo', constraints: { allowedShifts: ['T', 'N'] } },
  { id: 6, name: 'Camila Pérez', group: 'Auxiliar', contract: 'Indefinido', shiftMode: 'Rotativo', constraints: { allowedShifts: ['M', 'N'] } },
  { id: 7, name: 'Valentina Araya', group: 'Auxiliar', contract: 'Indefinido', shiftMode: 'Fijo', fixedShift: 'M' },
  { id: 8, name: 'Nicolás Díaz', group: 'Auxiliar', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 9, name: 'Javier Torres', group: 'Auxiliar', contract: 'Plazo fijo', shiftMode: 'Rotativo', constraints: { allowedShifts: ['M', 'T'] } },
  {
    id: 10,
    name: 'Sofía Lagos',
    group: 'Auxiliar',
    contract: 'Indefinido',
    shiftMode: 'Rotativo',
    constraints: { allowedShifts: ['M', 'N'] },
  },
]

export const prevWeekShifts: Record<number, Shift> = {
  1: 'N',
  2: 'T',
  3: 'N',
  4: 'M',
  5: 'T',
  6: 'M',
  7: 'M',
  8: 'N',
  9: 'T',
  10: 'N',
}

export const TASKS_BY_GROUP: Record<Worker['group'], string[]> = {
  Gruero: ['Operación grúa', 'Apoyo patio'],
  Auxiliar: ['Apoyo bodega', 'Control acceso'],
}
