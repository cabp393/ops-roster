import { useEffect, useMemo, useState } from 'react'
import { SHIFTS, SHIFT_LABEL, workers } from '../data/mock'
import { loadPlanning } from '../lib/storage'
import { summarizeWeek } from '../lib/summary'
import type { Assignment } from '../lib/types'

const fallbackWeekStart = '2025-12-29'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultWeekStart() {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const offset = (dayOfWeek + 6) % 7
    const monday = new Date(today)
    monday.setDate(today.getDate() - offset)
    return toDateInputValue(monday)
  } catch {
    return fallbackWeekStart
  }
}

export function SummaryPage() {
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart)
  const [assignments, setAssignments] = useState<Assignment[] | null>(null)

  useEffect(() => {
    const saved = loadPlanning(weekStart)
    setAssignments(saved?.assignments ?? null)
  }, [weekStart])

  const summary = useMemo(() => {
    if (!assignments) return null
    return summarizeWeek({ weekStart, workers, assignments })
  }, [assignments, weekStart])

  return (
    <section>
      <h2>Summary</h2>
      <div className="planning-controls">
        <label className="field">
          Week start
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
          />
        </label>
      </div>
      {!summary ? (
        <p className="summary">No plan found for this week. Generate it in Planning.</p>
      ) : (
        <>
          <p className="summary">
            Totals: {SHIFTS.map((shift) => `${shift}: ${summary.totalsByShift[shift]}`).join(', ')}
          </p>
          {summary.warnings.length > 0 ? (
            <div className="summary">
              <strong>Warnings</strong>
              <ul>
                {summary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {summary.tree.map((shift) => (
            <div key={shift.shift} className="summary-block">
              <h3>
                {shift.shiftLabel} ({shift.total})
              </h3>
              {shift.groups.length === 0 ? (
                <p className="summary">No assignments for {SHIFT_LABEL[shift.shift]}.</p>
              ) : (
                shift.groups.map((group) => (
                  <div key={group.group} className="summary-group">
                    <h4>
                      {group.group} ({group.total})
                    </h4>
                    <ul>
                      {group.tasks.map((task) => (
                        <li key={`${group.group}-${task.task}`}>
                          {task.task}: {task.total}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          ))}
        </>
      )}
    </section>
  )
}
