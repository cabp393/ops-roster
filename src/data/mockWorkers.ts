export type Worker = {
  id: number
  name: string
  group: 'Gruero' | 'Auxiliar'
  contract: 'Indefinido' | 'Plazo fijo'
  shiftMode: 'Rotativo' | 'Fijo'
  fixedShift?: 'M' | 'T' | 'N'
}

export const mockWorkers: Worker[] = [
  { id: 1, name: 'Cristian Soto', group: 'Gruero', contract: 'Indefinido', shiftMode: 'Rotativo' },
  { id: 2, name: 'Matías Rojas', group: 'Gruero', contract: 'Indefinido', shiftMode: 'Rotativo' },
  { id: 3, name: 'Felipe Muñoz', group: 'Gruero', contract: 'Indefinido', shiftMode: 'Fijo', fixedShift: 'N' },
  { id: 4, name: 'Diego Herrera', group: 'Gruero', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 5, name: 'Sebastián Vidal', group: 'Gruero', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 6, name: 'Camila Pérez', group: 'Auxiliar', contract: 'Indefinido', shiftMode: 'Rotativo' },
  { id: 7, name: 'Valentina Araya', group: 'Auxiliar', contract: 'Indefinido', shiftMode: 'Fijo', fixedShift: 'M' },
  { id: 8, name: 'Nicolás Díaz', group: 'Auxiliar', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 9, name: 'Javier Torres', group: 'Auxiliar', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 10, name: 'Sofía Lagos', group: 'Auxiliar', contract: 'Indefinido', shiftMode: 'Rotativo' },
]
