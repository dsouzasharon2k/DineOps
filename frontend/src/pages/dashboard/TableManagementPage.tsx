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

  const buildQrImageUrl = (qrCodeUrl: string | null) => {
    if (!qrCodeUrl) return null
    const absoluteUrl = qrCodeUrl.startsWith('http') ? qrCodeUrl : `${window.location.origin}${qrCodeUrl}`
    return `https://quickchart.io/qr?size=180&text=${encodeURIComponent(absoluteUrl)}`
  }

  const printQr = (table: DiningTable) => {
    const qrImage = buildQrImageUrl(table.qrCodeUrl)
    if (!qrImage) return
    const absoluteUrl = table.qrCodeUrl?.startsWith('http')
      ? table.qrCodeUrl
      : `${window.location.origin}${table.qrCodeUrl ?? ''}`
    const html = `
      <html>
      <head><title>QR - Table ${table.tableNumber}</title></head>
      <body style="font-family: Arial, sans-serif; text-align:center; padding:24px;">
        <h2 style="margin-bottom:4px;">PlatterOps</h2>
        <p style="margin-top:0;">Table ${table.tableNumber}</p>
        <img src="${qrImage}" alt="QR" style="width:220px;height:220px;" />
        <p style="font-size:12px; color:#666; margin-top:12px;">${absoluteUrl}</p>
      </body>
      </html>
    `
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
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
                <p className="text-xs text-gray-500">Capacity {table.capacity}</p>
                {buildQrImageUrl(table.qrCodeUrl) && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={buildQrImageUrl(table.qrCodeUrl) ?? undefined}
                      alt={`QR code for table ${table.tableNumber}`}
                      className="h-16 w-16 rounded border border-gray-200 bg-white"
                    />
                    <div className="flex flex-col gap-1">
                      <a
                        href={table.qrCodeUrl ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-orange-600 hover:underline break-all"
                      >
                        {table.qrCodeUrl}
                      </a>
                      <button
                        onClick={() => printQr(table)}
                        className="w-fit rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Print QR Template
                      </button>
                    </div>
                  </div>
                )}
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
