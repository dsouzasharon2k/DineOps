import { useEffect, useMemo, useState } from 'react'
import {
  addTicketCommentApi,
  createTicketApi,
  getTicketCommentsApi,
  getTicketsApi,
  updateTicketApi,
  updateTicketStatusApi,
} from '../../api/tickets'
import { getRestaurantsApi } from '../../api/restaurants'
import { getApiErrorMessage } from '../../api/error'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId, parseJwtPayload } from '../../utils/jwt'
import type { Restaurant } from '../../types/restaurant'
import type { Ticket, TicketComment, TicketPriority, TicketStatus, TicketType } from '../../types/ticket'

const TYPES: TicketType[] = ['BUG', 'PAYMENT', 'SUBSCRIPTION', 'ORDER_SYNC', 'INVENTORY', 'ACCOUNT_ACCESS', 'FEATURE_REQUEST', 'OTHER']
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

type WorkflowDraft = {
  assignedToEmail: string
  slaDueAt: string
  resolutionNotes: string
  priority: TicketPriority
}

const TicketsPage = () => {
  const { token } = useAuth()
  const claims = useMemo(() => parseJwtPayload(token), [token])
  const role = typeof claims?.role === 'string' ? claims.role : 'STAFF'
  const tenantId = useMemo(() => extractTenantId(token) ?? undefined, [token])
  const isSuperAdmin = role === 'SUPER_ADMIN'
  const canUpdateStatus = role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN'

  const [tickets, setTickets] = useState<Ticket[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenantId ?? '')
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null)
  const [commentsByTicketId, setCommentsByTicketId] = useState<Record<string, TicketComment[]>>({})
  const [commentDraftByTicketId, setCommentDraftByTicketId] = useState<Record<string, string>>({})
  const [workflowDraftByTicketId, setWorkflowDraftByTicketId] = useState<Record<string, WorkflowDraft>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TicketType>('BUG')
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<TicketType | 'ALL'>('ALL')

  const canCreateTicket = !isSuperAdmin || Boolean(selectedTenantId)

  const loadTickets = async () => {
    setLoading(true)
    setError('')
    try {
      const effectiveTenantId = isSuperAdmin ? selectedTenantId || undefined : tenantId
      const data = await getTicketsApi(effectiveTenantId)
      setTickets(data)
      setWorkflowDraftByTicketId(
        data.reduce<Record<string, WorkflowDraft>>((acc, ticket) => {
          acc[ticket.id] = {
            assignedToEmail: ticket.assignedToEmail ?? '',
            slaDueAt: ticket.slaDueAt ? ticket.slaDueAt.slice(0, 16) : '',
            resolutionNotes: ticket.resolutionNotes ?? '',
            priority: ticket.priority,
          }
          return acc
        }, {})
      )
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) {
      return
    }
    const loadRestaurants = async () => {
      try {
        const data = await getRestaurantsApi()
        setRestaurants(data)
      } catch (err) {
        setError(getApiErrorMessage(err))
      }
    }
    void loadRestaurants()
  }, [isSuperAdmin])

  useEffect(() => {
    void loadTickets()
  }, [token, selectedTenantId, isSuperAdmin])

  const visibleTickets = useMemo(() => {
    return tickets
      .filter((t) => (statusFilter === 'ALL' ? true : t.status === statusFilter))
      .filter((t) => (typeFilter === 'ALL' ? true : t.type === typeFilter))
  }, [tickets, statusFilter, typeFilter])

  const createTicket = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please add title and description.')
      return
    }
    setError('')
    try {
      await createTicketApi(
        {
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
        },
        isSuperAdmin ? selectedTenantId : undefined
      )
      setTitle('')
      setDescription('')
      setType('BUG')
      setPriority('MEDIUM')
      await loadTickets()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const toggleTicketDetails = async (ticketId: string) => {
    const nextExpanded = expandedTicketId === ticketId ? null : ticketId
    setExpandedTicketId(nextExpanded)
    if (nextExpanded === null || commentsByTicketId[ticketId]) {
      return
    }
    try {
      const comments = await getTicketCommentsApi(ticketId)
      setCommentsByTicketId((prev) => ({ ...prev, [ticketId]: comments }))
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const saveWorkflow = async (ticketId: string) => {
    const draft = workflowDraftByTicketId[ticketId]
    if (!draft) {
      return
    }
    try {
      const updated = await updateTicketApi(ticketId, {
        assignedToEmail: draft.assignedToEmail.trim() || null,
        slaDueAt: draft.slaDueAt || null,
        resolutionNotes: draft.resolutionNotes.trim() || null,
        priority: draft.priority,
      })
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)))
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const addComment = async (ticketId: string) => {
    const draft = (commentDraftByTicketId[ticketId] ?? '').trim()
    if (!draft) {
      return
    }
    try {
      const created = await addTicketCommentApi(ticketId, draft)
      setCommentsByTicketId((prev) => ({
        ...prev,
        [ticketId]: [...(prev[ticketId] ?? []), created],
      }))
      setCommentDraftByTicketId((prev) => ({ ...prev, [ticketId]: '' }))
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const updateStatus = async (ticketId: string, nextStatus: TicketStatus) => {
    try {
      const updated = await updateTicketStatusApi(ticketId, nextStatus)
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? updated : ticket)))
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">Issues & Tickets</h1>
      <p className="mt-1 text-sm text-gray-500">Create and track support issues with backend persistence.</p>

      {isSuperAdmin && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-600 mb-2">Tenant scope</label>
          <select
            value={selectedTenantId}
            onChange={(event) => setSelectedTenantId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All tenants</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">Choose a tenant to create a ticket, or All tenants to browse across platform.</p>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800">Create ticket</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Issue title"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select value={type} onChange={(event) => setType(event.target.value as TicketType)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue clearly..."
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:col-span-2 min-h-24"
          />
          <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button
            onClick={() => void createTicket()}
            disabled={!canCreateTicket}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lodge ticket
          </button>
        </div>
        {isSuperAdmin && !selectedTenantId && (
          <p className="mt-2 text-xs text-amber-700">
            Super admin ticket creation requires selecting a tenant scope above.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TicketStatus | 'ALL')} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="ALL">All statuses</option>
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TicketType | 'ALL')} className="rounded-lg border border-gray-300 px-3 py-2 text-xs">
            <option value="ALL">All types</option>
            {TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Loading tickets...</p>
        ) : visibleTickets.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No tickets found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {visibleTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button onClick={() => void toggleTicketDetails(ticket.id)} className="font-medium text-left text-gray-800 hover:text-orange-600">
                    {ticket.title}
                  </button>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-600">{ticket.type}</span>
                    <span className="rounded bg-orange-50 px-2 py-1 text-orange-600">{ticket.priority}</span>
                    {canUpdateStatus ? (
                      <select
                        value={ticket.status}
                        onChange={(event) => void updateStatus(ticket.id, event.target.value as TicketStatus)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    ) : (
                      <span className="rounded bg-blue-50 px-2 py-1 text-blue-600">{ticket.status}</span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-700">{ticket.description}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(ticket.createdAt).toLocaleString()} · {ticket.createdByEmail} · Tenant: {ticket.tenantId}
                </p>

                {expandedTicketId === ticket.id && (
                  <div className="mt-4 border-t border-gray-100 pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        value={workflowDraftByTicketId[ticket.id]?.assignedToEmail ?? ''}
                        onChange={(event) => setWorkflowDraftByTicketId((prev) => ({
                          ...prev,
                          [ticket.id]: {
                            ...(prev[ticket.id] ?? { assignedToEmail: '', slaDueAt: '', resolutionNotes: '', priority: ticket.priority }),
                            assignedToEmail: event.target.value,
                          },
                        }))}
                        placeholder="Assign to email"
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="datetime-local"
                        value={workflowDraftByTicketId[ticket.id]?.slaDueAt ?? ''}
                        onChange={(event) => setWorkflowDraftByTicketId((prev) => ({
                          ...prev,
                          [ticket.id]: {
                            ...(prev[ticket.id] ?? { assignedToEmail: '', slaDueAt: '', resolutionNotes: '', priority: ticket.priority }),
                            slaDueAt: event.target.value,
                          },
                        }))}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      />
                      <select
                        value={workflowDraftByTicketId[ticket.id]?.priority ?? ticket.priority}
                        onChange={(event) => setWorkflowDraftByTicketId((prev) => ({
                          ...prev,
                          [ticket.id]: {
                            ...(prev[ticket.id] ?? { assignedToEmail: '', slaDueAt: '', resolutionNotes: '', priority: ticket.priority }),
                            priority: event.target.value as TicketPriority,
                          },
                        }))}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </div>
                    <textarea
                      value={workflowDraftByTicketId[ticket.id]?.resolutionNotes ?? ''}
                      onChange={(event) => setWorkflowDraftByTicketId((prev) => ({
                        ...prev,
                        [ticket.id]: {
                          ...(prev[ticket.id] ?? { assignedToEmail: '', slaDueAt: '', resolutionNotes: '', priority: ticket.priority }),
                          resolutionNotes: event.target.value,
                        },
                      }))}
                      placeholder="Resolution notes"
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs min-h-20"
                    />
                    {canUpdateStatus && (
                      <button
                        onClick={() => void saveWorkflow(ticket.id)}
                        className="rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
                      >
                        Save Workflow
                      </button>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Comments</p>
                      <div className="space-y-2">
                        {(commentsByTicketId[ticket.id] ?? []).map((comment) => (
                          <div key={comment.id} className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs">
                            <p className="text-gray-700">{comment.body}</p>
                            <p className="text-gray-400 mt-1">{comment.authorEmail} · {new Date(comment.createdAt).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={commentDraftByTicketId[ticket.id] ?? ''}
                          onChange={(event) => setCommentDraftByTicketId((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                          placeholder="Add comment"
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => void addComment(ticket.id)}
                          className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

export default TicketsPage

