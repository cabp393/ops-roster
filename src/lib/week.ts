const DAY_MS = 24 * 60 * 60 * 1000

function toDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function formatDate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatDateShort(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = MONTHS_SHORT[date.getUTCMonth()] ?? ''
  return `${day}-${month}`
}

export function getIsoWeekNumber(date: Date) {
  const temp = toDateOnly(date)
  const day = temp.getUTCDay() || 7
  temp.setUTCDate(temp.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  return Math.ceil(((temp.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)
}

export function getIsoWeekYear(date: Date) {
  const temp = toDateOnly(date)
  const day = temp.getUTCDay() || 7
  temp.setUTCDate(temp.getUTCDate() + 4 - day)
  return temp.getUTCFullYear()
}

export function getWeekStartDate(weekNumber: number, year: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1))
  const target = new Date(mondayWeek1)
  target.setUTCDate(mondayWeek1.getUTCDate() + (weekNumber - 1) * 7)
  return target
}

export function getWeekEndDate(weekStart: Date) {
  const end = new Date(weekStart)
  end.setUTCDate(weekStart.getUTCDate() + 6)
  return end
}

export function getWeekRangeLabel(weekNumber: number, year: number) {
  const start = getWeekStartDate(weekNumber, year)
  const end = getWeekEndDate(start)
  return `${formatDateShort(start)} a ${formatDateShort(end)}`
}
