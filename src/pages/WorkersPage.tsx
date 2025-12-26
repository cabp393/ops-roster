import { mockWorkers } from '../data/mockWorkers'

export function WorkersPage() {
  return (
    <section>
      <h2>Workers</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Group</th>
              <th>Contract</th>
              <th>Shift Mode</th>
              <th>Fixed Shift</th>
            </tr>
          </thead>
          <tbody>
            {mockWorkers.map((worker) => (
              <tr key={worker.id}>
                <td>{worker.id}</td>
                <td>{worker.name}</td>
                <td>{worker.group}</td>
                <td>{worker.contract}</td>
                <td>{worker.shiftMode}</td>
                <td>{worker.fixedShift ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
