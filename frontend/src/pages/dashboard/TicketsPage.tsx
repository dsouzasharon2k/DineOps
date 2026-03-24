import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

type TicketType =
  | 'BUG'
  | 'PAYMENT'
  | 'SUBSCRIPTION'
  | 'ORDER_SYNC'
  | 'INVENTORY'
  | 'ACCOUNT_ACCESS'
  | 'FEATURE_REQUEST'
  | 'OTHER'

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

type Ticket = {
  id: string
  title: string
  description: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  createdBy: string
  tenantId: string | null
}

const STORAGE_KEY = 'dineops_support_tickets_v1'

const TYPES: TicketType[] = ['BUG', 'PAYMENT', 'SUBSCRIPTION', 'ORDER_SYNC', 'INVENTORY', 'ACCOUNT_ACCESS', 'FEATURE_REQUEST', 'OTHER']
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const readTickets = (): Ticket[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Ticket[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeTickets = (tickets: Ticket[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets))
}

const getClaims = (token: string | null): { role: string; sub: string; tenantId: string | null } => {
  if (!token) return { role: 'STAFF', sub: 'unknown@user', tenantId: null }
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { role?: string; sub?: string; tenantId?: string }
    return {
      role: payload.role ?? 'STAFF',
      sub: payload.sub ?? 'unknown@user',
      tenantId: payload.tenantId ?? null,
    }
  } catch {
    return { role: 'STAFF', sub: 'unknown@user', tenantId: null }
  }
}

const TicketsPage = () => {
  const { token } = useAuth()
  const claims = useMemo(() => getClaims(token), [token])
  const isSuperAdmin = claims.role === 'SUPER_ADMIN'

  const [tickets, setTickets] = useState<Ticket[]>(() => readTickets())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TicketType>('BUG')
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM')
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'ALL'>('ALL')

  const visibleTickets = useMemo(() => {
    const base = isSuperAdmin
      ? tickets
      : tickets.filter((t) => (claims.tenantId ? t.tenantId === claims.tenantId : t.createdBy === claims.sub))
    return base
      .filter((t) => (statusFilter === 'ALL' ? true : t.status === statusFilter))
      .filter((t) => (typeFilter === 'ALL' ? true : t.type === typeFilter))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [claims.sub, claims.tenantId, isSuperAdmin, statusFilter, tickets, typeFilter])

  const createTicket = () => {
    if (!title.trim() || !description.trim()) {
      setError('Please add title and description.')
      return
    }
    const next: Ticket = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      createdBy: claims.sub,
      tenantId: claims.tenantId,
    }
    const all = [next, ...tickets]
    setTickets(all)
    writeTickets(all)
    setTitle('')
    setDescription('')
    setType('BUG')
    setPriority('MEDIUM')
    setError('')
  }

  const updateStatus = (ticketId: string, nextStatus: TicketStatus) => {
    const all = tickets.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t))
    setTickets(all)
    writeTickets(all)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Issues & Tickets</h1>
      <p className="mt-1 text-sm text-gray-500">
        {isSuperAdmin ? 'Super admin queue for support operations.' : 'Lodge issues for platform support.'}
      </p>

      {!isSuperAdmin && (
        <div className="mt-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800">Create ticket</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select value={type} onChange={(e) => setType(e.target.value as TicketType)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue clearly..."
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2 min-h-[90px]"
            />
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={createTicket} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
              Lodge ticket
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'ALL')} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TicketType | 'ALL')} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="ALL">All types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {visibleTickets.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No tickets found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-800">{ticket.title}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">{ticket.type}</span>
                    <span className="rounded bg-orange-50 px-2 py-1 text-orange-600">{ticket.priority}</span>
                    {isSuperAdmin ? (
                      <select
                        value={ticket.status}
                        onChange={(e) => updateStatus(ticket.id, e.target.value as TicketStatus)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="rounded bg-blue-50 px-2 py-1 text-blue-600">{ticket.status}</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-700">{ticket.description}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(ticket.createdAt).toLocaleString()} · {ticket.createdBy}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TicketsPage

