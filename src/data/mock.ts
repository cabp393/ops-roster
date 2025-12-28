import type { Role, Shift, Task, Worker } from '../types'

export const SHIFTS: Shift[] = ['M', 'T', 'N']

export const SHIFT_LABEL: Record<Shift, string> = {
  M: 'Mañana',
  T: 'Tarde',
  N: 'Noche',
}

export const defaultRoles: Role[] = [
  { id: 'role-og', code: 'OG', name: 'Operador Grúa', isActive: true, countsForBalance: true },
  { id: 'role-al', code: 'AL', name: 'Auxiliar Logística', isActive: true, countsForBalance: true },
  { id: 'role-jt', code: 'JT', name: 'Jefe Turno', isActive: true, countsForBalance: true },
]

export const defaultTasks: Task[] = [
  {
    id: 'task-operacion-grua',
    name: 'Operación grúa',
    allowedRoleCodes: ['OG'],
    isActive: true,
  },
  {
    id: 'task-apoyo-patio',
    name: 'Apoyo patio',
    allowedRoleCodes: ['OG'],
    isActive: true,
  },
  {
    id: 'task-apoyo-bodega',
    name: 'Apoyo bodega',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-control-acceso',
    name: 'Control acceso',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-control-ticket',
    name: 'Control Ticket',
    allowedRoleCodes: ['AL', 'JT'],
    isActive: true,
  },
  {
    id: 'task-control-pallet',
    name: 'Control Pallet',
    allowedRoleCodes: ['AL', 'JT'],
    isActive: true,
  },
  {
    id: 'task-descarga',
    name: 'Descarga',
    allowedRoleCodes: ['OG', 'AL'],
    isActive: true,
  },
  {
    id: 'task-carga',
    name: 'Carga',
    allowedRoleCodes: ['OG', 'AL'],
    isActive: true,
  },
  {
    id: 'task-alto-valor',
    name: 'Alto Valor',
    allowedRoleCodes: ['AL', 'JT'],
    isActive: true,
  },
  {
    id: 'task-transferencia-alto-valor',
    name: 'Transferencia Alto Valor',
    allowedRoleCodes: ['AL', 'JT'],
    isActive: true,
  },
  {
    id: 'task-remonte-reposicion',
    name: 'Remonte y Reposición',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-retorno-envases',
    name: 'Retorno Envases',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-retorno-producto',
    name: 'Retorno Producto',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-tygard',
    name: 'Tygard',
    allowedRoleCodes: ['OG', 'AL'],
    isActive: true,
  },
  {
    id: 'task-apoyo-tygard',
    name: 'Apoyo Tygard',
    allowedRoleCodes: ['OG', 'AL'],
    isActive: true,
  },
  {
    id: 'task-apoyo-picking',
    name: 'Apoyo Picking',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-reempaque-alto-valor',
    name: 'Reempaque Alto Valor',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
  {
    id: 'task-picking-alto-valor',
    name: 'Picking Alto Valor',
    allowedRoleCodes: ['AL'],
    isActive: true,
  },
]

export const defaultWorkers: Worker[] = [
  { id: 1, firstName: 'Cristian', secondName: '', lastName: 'Soto', motherLastName: '', roleCode: 'OG', contract: 'Indefinido', shiftMode: 'Rotativo' },
  { id: 2, firstName: 'Matías', secondName: '', lastName: 'Rojas', motherLastName: '', roleCode: 'OG', contract: 'Indefinido', shiftMode: 'Rotativo', constraints: { allowedShifts: ['M', 'T'] } },
  { id: 3, firstName: 'Felipe', secondName: '', lastName: 'Muñoz', motherLastName: '', roleCode: 'OG', contract: 'Indefinido', shiftMode: 'Fijo', fixedShift: 'N' },
  { id: 4, firstName: 'Diego', secondName: '', lastName: 'Herrera', motherLastName: '', roleCode: 'OG', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 5, firstName: 'Sebastián', secondName: '', lastName: 'Vidal', motherLastName: '', roleCode: 'OG', contract: 'Plazo fijo', shiftMode: 'Rotativo', constraints: { allowedShifts: ['T', 'N'] } },
  { id: 6, firstName: 'Camila', secondName: '', lastName: 'Pérez', motherLastName: '', roleCode: 'AL', contract: 'Indefinido', shiftMode: 'Rotativo', constraints: { allowedShifts: ['M', 'N'] } },
  { id: 7, firstName: 'Valentina', secondName: '', lastName: 'Araya', motherLastName: 'Rojas', roleCode: 'AL', contract: 'Indefinido', shiftMode: 'Fijo', fixedShift: 'M' },
  { id: 8, firstName: 'Nicolás', secondName: '', lastName: 'Díaz', motherLastName: '', roleCode: 'AL', contract: 'Plazo fijo', shiftMode: 'Rotativo' },
  { id: 9, firstName: 'Javier', secondName: '', lastName: 'Torres', motherLastName: '', roleCode: 'AL', contract: 'Plazo fijo', shiftMode: 'Rotativo', constraints: { allowedShifts: ['M', 'T'] } },
  { id: 10, firstName: 'Sofía', secondName: '', lastName: 'Lagos', motherLastName: '', roleCode: 'AL', contract: 'Indefinido', shiftMode: 'Rotativo' },
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
