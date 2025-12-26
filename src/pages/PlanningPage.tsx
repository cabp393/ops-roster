import { useState } from 'react'

const today = new Date().toISOString().slice(0, 10)

export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(today)

  return (
    <section>
      <h2>Planning</h2>
      <label className="field">
        Week start
        <input
          type="date"
          value={weekStart}
          onChange={(event) => setWeekStart(event.target.value)}
        />
      </label>
      <div className="placeholder">Planning coming next</div>
    </section>
  )
}
