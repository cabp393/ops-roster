import { useEffect, useMemo, useState } from 'react'
import { SHIFT_LABEL } from '../data/mock'
import { getRoles, getWorkers } from '../lib/storage'
import type { Role, Worker } from '../types'

export function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  useEffect(() => {
    setWorkers(getWorkers())
    setRoles(getRoles())
  }, [])

  const roleNameByCode = useMemo(() => new Map(roles.map((role) => [role.code, role.name])), [roles])

  return (
    <section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Contract</th>
              <th>Shift Mode</th>
              <th>Fixed Shift</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id}>
                <td>{worker.id}</td>
                <td>{worker.name}</td>
                <td>
                  {worker.roleCode}
                  {roleNameByCode.get(worker.roleCode) ? ` (${roleNameByCode.get(worker.roleCode)})` : ''}
                </td>
                <td>{worker.contract}</td>
                <td>{worker.shiftMode}</td>
                <td>{worker.fixedShift ? SHIFT_LABEL[worker.fixedShift] : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
