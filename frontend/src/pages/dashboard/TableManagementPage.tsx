import { useCallback, useEffect, useMemo, useState } from 'react'
import { createTableApi, deleteTableApi, getTablesApi, updateTableApi } from '../../api/tables'
import type { DiningTable, DiningTableStatus } from '../../types/table'
import { getApiErrorMessage } from '../../api/error'
import { useAuth } from '../../context/AuthContext'

const extractTenantId = (token: string | null): string | null => {
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.tenantId ?? null
  } catch {
    return null
  }
}

const STATUSES: DiningTableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE']

const TableManagementPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [tables, setTables] = useState<DiningTable[]>([])
  const [tableNumber, setTableNumber] = useState('')
  const [capacity, setCapacity] = useState(4)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError('')
    try {
      setTables(await getTablesApi(tenantId))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load tables.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    load()
  }, [load])

  const addTable = async () => {
    if (!tenantId || !tableNumber.trim()) return
    try {
      await createTableApi(tenantId, { tableNumber: tableNumber.trim(), capacity })
      setTableNumber('')
      setCapacity(4)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create table.'))
    }
  }

  const updateStatus = async (table: DiningTable, status: DiningTableStatus) => {
    if (!tenantId) return
    try {
      await updateTableApi(tenantId, table.id, { capacity: table.capacity, status })
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update table.'))
    }
  }

  const removeTable = async (tableId: string) => {
    if (!tenantId) return
    try {
      await deleteTableApi(tenantId, tableId)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete table.'))
    }
  }

  if (!tenantId) {
    return <p className="text-sm text-gray-500">Tenant context missing for table management.</p>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Table Management</h1>
      </div>
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-gray-700">Add table</p>
        <div className="flex gap-2">
          <input
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Table number (e.g., T1)"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={addTable}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading tables...</p>
        ) : tables.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No tables created yet.</p>
        ) : (
          tables.map((table) => (
            <div key={table.id} className="flex items-center justify-between border-b border-gray-100 p-4 last:border-b-0">
              <div>
                <p className="font-medium text-gray-800">Table {table.tableNumber}</p>
                <p className="text-xs text-gray-500">Capacity {table.capacity} • QR {table.qrCodeUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={table.status}
                  onChange={(e) => updateStatus(table, e.target.value as DiningTableStatus)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeTable(table.id)}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TableManagementPage
