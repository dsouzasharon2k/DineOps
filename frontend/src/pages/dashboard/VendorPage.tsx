import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createPurchaseOrderApi, createVendorApi, deleteVendorApi,
  getPurchaseOrdersApi, getVendorsApi, linkInventoryToVendorApi,
  unlinkInventoryFromVendorApi, updatePOStatusApi, updateVendorApi,
  type CreatePOPayload, type PurchaseOrder, type Vendor,
} from '../../api/vendors'
import { getInventoryByTenantApi } from '../../api/inventory'
import { getApiErrorMessage } from '../../api/error'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../context/AuthContext'
import { extractTenantId } from '../../utils/jwt'
import ToastMessage from '../../components/ToastMessage'
import type { InventoryItem } from '../../types/inventory'

const CATEGORIES = ['VEGETABLES', 'DAIRY', 'MEAT', 'DRY_GROCERY', 'PACKAGING', 'OTHER']
const CATEGORY_LABEL: Record<string, string> = {
  VEGETABLES: '🥬 Vegetables', DAIRY: '🥛 Dairy', MEAT: '🍗 Meat',
  DRY_GROCERY: '🛒 Dry Grocery', PACKAGING: '📦 Packaging', OTHER: '📋 Other',
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

type Tab = 'vendors' | 'orders'

interface POLineItem {
  inventoryId: string
  itemName: string
  quantity: number
  unit: string
  unitPrice: number
}

const emptyVendorForm = () => ({
  vendorName: '', contactPerson: '', phoneNumber: '', category: 'VEGETABLES', address: '', notes: '',
})

const VendorPage = () => {
  const { token } = useAuth()
  const tenantId = useMemo(() => extractTenantId(token), [token])
  const [searchParams] = useSearchParams()

  // Auto-open PO tab and pre-select vendor when navigated from Inventory "Reorder" button
  const autoVendorId = searchParams.get('vendor')
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'orders' ? 'orders' : 'vendors')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Vendor form
  const [vendorForm, setVendorForm] = useState(emptyVendorForm)
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const [showVendorForm, setShowVendorForm] = useState(false)

  // Link inventory panel
  const [linkingVendorId, setLinkingVendorId] = useState<string | null>(null)
  const [linkInventoryId, setLinkInventoryId] = useState('')
  const [linkPrice, setLinkPrice] = useState('')
  const [linkPreferred, setLinkPreferred] = useState(false)

  // PO creation
  const [showPOForm, setShowPOForm] = useState(false)
  const [poVendorId, setPOVendorId] = useState('')
  const [poNotes, setPONotes] = useState('')
  const [poLines, setPOLines] = useState<POLineItem[]>([
    { inventoryId: '', itemName: '', quantity: 1, unit: 'kg', unitPrice: 0 },
  ])

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const [v, po, inv] = await Promise.all([
        getVendorsApi(tenantId),
        getPurchaseOrdersApi(tenantId),
        getInventoryByTenantApi(tenantId),
      ])
      setVendors(v)
      setOrders(po)
      setInventory(inv)
      // Auto-select vendor from query param (set by Inventory "Reorder" button)
      if (autoVendorId && v.some((vend) => vend.id === autoVendorId)) {
        setPOVendorId(autoVendorId)
        setShowPOForm(true)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load data.'))
    } finally {
      setLoading(false)
    }
  }, [tenantId, autoVendorId])

  useEffect(() => {
    if (tenantId) load()
    else setLoading(false)
  }, [tenantId, load])

  // ── Vendor CRUD ────────────────────────────────────────────────────────────

  const submitVendorForm = async () => {
    if (!tenantId || !vendorForm.vendorName.trim()) return
    try {
      if (editingVendorId) {
        await updateVendorApi(tenantId, editingVendorId, vendorForm)
        setSuccess('Vendor updated.')
      } else {
        await createVendorApi(tenantId, vendorForm)
        setSuccess('Vendor added.')
      }
      setShowVendorForm(false)
      setEditingVendorId(null)
      setVendorForm(emptyVendorForm())
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save vendor.'))
    }
  }

  const startEdit = (v: Vendor) => {
    setEditingVendorId(v.id)
    setVendorForm({
      vendorName: v.vendorName, contactPerson: v.contactPerson ?? '',
      phoneNumber: v.phoneNumber ?? '', category: v.category,
      address: v.address ?? '', notes: v.notes ?? '',
    })
    setShowVendorForm(true)
  }

  const handleDelete = async (vendorId: string) => {
    if (!tenantId || !confirm('Delete this vendor?')) return
    try {
      await deleteVendorApi(tenantId, vendorId)
      setSuccess('Vendor deleted.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete vendor.'))
    }
  }

  // ── Link inventory ─────────────────────────────────────────────────────────

  const handleLinkInventory = async () => {
    if (!tenantId || !linkingVendorId || !linkInventoryId) return
    try {
      await linkInventoryToVendorApi(tenantId, linkingVendorId, {
        inventoryId: linkInventoryId,
        lastPurchasePrice: linkPrice ? Math.round(Number(linkPrice) * 100) : undefined,
        preferredVendor: linkPreferred,
      })
      setSuccess('Item linked to vendor.')
      setLinkInventoryId(''); setLinkPrice(''); setLinkPreferred(false)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to link item.'))
    }
  }

  const handleUnlink = async (vendorId: string, inventoryId: string) => {
    if (!tenantId) return
    try {
      await unlinkInventoryFromVendorApi(tenantId, vendorId, inventoryId)
      setSuccess('Item unlinked.')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to unlink.'))
    }
  }

  // ── Purchase Orders ────────────────────────────────────────────────────────

  const patchLine = (i: number, patch: Partial<POLineItem>) => {
    setPOLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  const poTotal = poLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)

  const buildWhatsAppPO = (po: PurchaseOrder) => {
    if (!po.vendorPhone) return null
    const lines = po.items.map((i) => `• ${i.itemName}: ${i.quantity} ${i.unit} @ ₹${(i.unitPrice / 100).toFixed(2)}`).join('\n')
    const msg = `Hello, this is a purchase order from our restaurant.\n\n${lines}\n\nTotal: ${formatCurrency(po.totalAmount ?? 0)}\n\nPlease confirm availability. Thank you!`
    const phone = po.vendorPhone.replace(/\D/g, '')
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
  }

  const submitPO = async () => {
    if (!tenantId || !poVendorId) return
    const validLines = poLines.filter((l) => l.itemName.trim() && l.unitPrice > 0 && l.quantity > 0)
    if (validLines.length === 0) { setError('Add at least one item with a price.'); return }
    const payload: CreatePOPayload = {
      vendorId: poVendorId, notes: poNotes || undefined,
      items: validLines.map((l) => ({
        inventoryId: l.inventoryId || undefined,
        itemName: l.itemName, quantity: l.quantity,
        unit: l.unit, unitPrice: Math.round(l.unitPrice * 100),
      })),
    }
    try {
      const po = await createPurchaseOrderApi(tenantId, payload)
      setSuccess('Purchase order created.')
      setShowPOForm(false); setPOVendorId(''); setPONotes('')
      setPOLines([{ inventoryId: '', itemName: '', quantity: 1, unit: 'kg', unitPrice: 0 }])
      // Auto-open WhatsApp if vendor has phone
      const waUrl = buildWhatsAppPO(po)
      if (waUrl) window.open(waUrl, '_blank')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create PO.'))
    }
  }

  const handleStatusChange = async (po: PurchaseOrder, status: string) => {
    if (!tenantId) return
    try {
      await updatePOStatusApi(tenantId, po.id, status)
      if (status === 'RECEIVED') setSuccess('PO marked received — stock updated automatically!')
      else setSuccess(`PO status updated to ${status}.`)
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update status.'))
    }
  }

  // ── Summary stats ──────────────────────────────────────────────────────────
  const draftCount = orders.filter((o) => o.status === 'DRAFT').length
  const sentCount = orders.filter((o) => o.status === 'SENT').length
  const totalSpend = orders.filter((o) => o.status === 'RECEIVED').reduce((s, o) => s + (o.totalAmount ?? 0), 0)

  if (loading) return <p className="p-4 text-sm text-gray-500">Loading vendors…</p>

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Vendors & Procurement</h1>
          <p className="mt-1 text-sm text-gray-500">Manage suppliers, track pricing, and create purchase orders with one-click WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl bg-white px-4 py-2 shadow-sm text-center">
            <p className="text-[11px] text-gray-400">Vendors</p>
            <p className="text-lg font-bold text-gray-800">{vendors.length}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 shadow-sm text-center">
            <p className="text-[11px] text-gray-400">Open POs</p>
            <p className="text-lg font-bold text-blue-600">{draftCount + sentCount}</p>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 shadow-sm text-center">
            <p className="text-[11px] text-gray-400">Total Procured</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalSpend)}</p>
          </div>
        </div>
      </div>

      {error && <ToastMessage message={error} variant="error" onClose={() => setError('')} />}
      {success && <ToastMessage message={success} variant="success" onClose={() => setSuccess('')} />}

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-gray-200">
        {(['vendors', 'orders'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === t ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'vendors' ? '🏪 Vendors' : '📋 Purchase Orders'}
          </button>
        ))}
      </div>

      {/* ═══════════ VENDORS TAB ═══════════ */}
      {tab === 'vendors' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button onClick={() => { setShowVendorForm(true); setEditingVendorId(null); setVendorForm(emptyVendorForm()) }}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              + Add Vendor
            </button>
          </div>

          {/* Vendor form */}
          {showVendorForm && (
            <div className="mb-4 rounded-xl bg-white p-5 shadow-sm border border-orange-100">
              <p className="mb-3 text-sm font-semibold text-gray-700">
                {editingVendorId ? 'Edit Vendor' : 'New Vendor'}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input value={vendorForm.vendorName} onChange={(e) => setVendorForm((f) => ({ ...f, vendorName: e.target.value }))}
                  placeholder="Vendor / Shop name *" className="rounded-lg border border-gray-200 px-3 py-2 text-sm col-span-full sm:col-span-1" />
                <input value={vendorForm.contactPerson} onChange={(e) => setVendorForm((f) => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="Contact person" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input type="tel" value={vendorForm.phoneNumber} onChange={(e) => setVendorForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="Phone / WhatsApp number" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <select value={vendorForm.category} onChange={(e) => setVendorForm((f) => ({ ...f, category: e.target.value }))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
                <input value={vendorForm.address} onChange={(e) => setVendorForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Address / Market area" className="rounded-lg border border-gray-200 px-3 py-2 text-sm sm:col-span-2" />
                <textarea value={vendorForm.notes} onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes (e.g., delivers before 8 AM)" rows={2}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm col-span-full" />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setShowVendorForm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={submitVendorForm}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                  {editingVendorId ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </div>
          )}

          {vendors.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-3xl mb-2">🏪</p>
              <p className="text-sm font-medium text-gray-700">No vendors yet</p>
              <p className="text-xs text-gray-400 mt-1">Add your vegetable mandi, dairy supplier, or any local vendor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {vendors.map((vendor) => {
                const isLinking = linkingVendorId === vendor.id
                const waUrl = vendor.phoneNumber
                  ? `https://wa.me/${vendor.phoneNumber.replace(/\D/g, '')}`
                  : null

                return (
                  <div key={vendor.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800 truncate">{vendor.vendorName}</p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                            {CATEGORY_LABEL[vendor.category] ?? vendor.category}
                          </span>
                        </div>
                        {vendor.contactPerson && <p className="text-xs text-gray-500 mt-0.5">👤 {vendor.contactPerson}</p>}
                        {vendor.phoneNumber && <p className="text-xs text-gray-500">📞 {vendor.phoneNumber}</p>}
                        {vendor.address && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {vendor.address}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {waUrl && (
                          <a href={waUrl} target="_blank" rel="noreferrer"
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100" title="WhatsApp">
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                          </a>
                        )}
                        <button onClick={() => startEdit(vendor)}
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
                        <button onClick={() => handleDelete(vendor.id)}
                          className="rounded-lg border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </div>

                    {/* Linked inventory items */}
                    {vendor.linkedItems.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1.5">Supplies</p>
                        <div className="flex flex-wrap gap-1.5">
                          {vendor.linkedItems.map((item) => (
                            <div key={item.vendorItemId}
                              className="group flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px]">
                              {item.preferredVendor && <span title="Preferred vendor">⭐</span>}
                              <span className="text-gray-700">{item.menuItemName}</span>
                              {item.lastPurchasePrice != null && (
                                <span className="text-gray-400">@ {formatCurrency(item.lastPurchasePrice)}/{item.unit}</span>
                              )}
                              <button onClick={() => handleUnlink(vendor.id, item.inventoryId)}
                                className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Link inventory item panel */}
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      {isLinking ? (
                        <div className="flex flex-wrap gap-2">
                          <select value={linkInventoryId} onChange={(e) => setLinkInventoryId(e.target.value)}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs">
                            <option value="">Select inventory item…</option>
                            {inventory.filter((i) => !vendor.linkedItems.some((li) => li.inventoryId === i.id))
                              .map((i) => <option key={i.id} value={i.id}>{i.menuItemName}</option>)}
                          </select>
                          <input type="number" value={linkPrice} onChange={(e) => setLinkPrice(e.target.value)}
                            placeholder="Price/unit (₹)" className="w-28 rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={linkPreferred} onChange={(e) => setLinkPreferred(e.target.checked)} />
                            Preferred
                          </label>
                          <button onClick={handleLinkInventory}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600">Link</button>
                          <button onClick={() => setLinkingVendorId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setLinkingVendorId(vendor.id)}
                          className="text-xs text-orange-500 hover:text-orange-700 font-medium">
                          + Link inventory item
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ PURCHASE ORDERS TAB ═══════════ */}
      {tab === 'orders' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button onClick={() => setShowPOForm(!showPOForm)}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
              + Create Purchase Order
            </button>
          </div>

          {/* PO creation form */}
          {showPOForm && (
            <div className="mb-4 rounded-xl bg-white p-5 shadow-sm border border-orange-100">
              <p className="mb-3 text-sm font-semibold text-gray-700">New Purchase Order</p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vendor *</label>
                  <select value={poVendorId} onChange={(e) => setPOVendorId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">Select vendor…</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <input value={poNotes} onChange={(e) => setPONotes(e.target.value)}
                    placeholder="e.g. Deliver before 7 AM"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Line items */}
              <p className="text-xs font-semibold text-gray-600 mb-2">Items to Order</p>
              <div className="space-y-2 mb-3">
                {poLines.map((line, i) => {
                  const invMatch = inventory.find((inv) => inv.id === line.inventoryId)
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <select value={line.inventoryId}
                        onChange={(e) => {
                          const inv = inventory.find((x) => x.id === e.target.value)
                          patchLine(i, { inventoryId: e.target.value, itemName: inv?.menuItemName ?? '', unit: inv?.unit ?? 'kg' })
                        }}
                        className="col-span-3 rounded-lg border border-gray-200 px-2 py-1.5 text-xs">
                        <option value="">Custom item…</option>
                        {inventory.map((inv) => <option key={inv.id} value={inv.id}>{inv.menuItemName}</option>)}
                      </select>
                      <input value={line.itemName} onChange={(e) => patchLine(i, { itemName: e.target.value })}
                        placeholder={invMatch ? invMatch.menuItemName : 'Item name'}
                        className="col-span-3 rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                      <input type="number" min={0.1} step={0.1} value={line.quantity}
                        onChange={(e) => patchLine(i, { quantity: Number(e.target.value) })}
                        className="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                      <select value={line.unit} onChange={(e) => patchLine(i, { unit: e.target.value })}
                        className="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-xs">
                        {['kg', 'ltr', 'pcs', 'gm', 'ml', 'dozen', 'box'].map((u) => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" min={0} step={0.5} value={line.unitPrice}
                        onChange={(e) => patchLine(i, { unitPrice: Number(e.target.value) })}
                        placeholder="₹/unit"
                        className="col-span-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                      <button onClick={() => setPOLines((l) => l.filter((_, idx) => idx !== i))}
                        className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none font-bold">×</button>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setPOLines((l) => [...l, { inventoryId: '', itemName: '', quantity: 1, unit: 'kg', unitPrice: 0 }])}
                className="text-xs text-orange-500 font-medium hover:text-orange-700 mb-3">+ Add row</button>

              {poLines.length > 0 && (
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Estimated total: <span className="text-orange-600">{formatCurrency(poTotal * 100)}</span>
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => setShowPOForm(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={submitPO}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                  Create PO + WhatsApp Vendor
                </button>
              </div>
            </div>
          )}

          {/* PO list */}
          {orders.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-medium text-gray-700">No purchase orders yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first PO and send it directly to your vendor via WhatsApp.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((po) => {
                const waUrl = buildWhatsAppPO(po)
                const canProgress = po.status !== 'RECEIVED' && po.status !== 'CANCELLED'
                const nextStatus: Record<string, string> = { DRAFT: 'SENT', SENT: 'RECEIVED' }

                return (
                  <div key={po.id} className="rounded-xl bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800">{po.vendorName}</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[po.status]}`}>
                            {po.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Created {new Date(po.createdAt).toLocaleDateString('en-IN')}
                          {po.receivedAt && ` · Received ${new Date(po.receivedAt).toLocaleDateString('en-IN')}`}
                        </p>
                        {po.notes && <p className="text-xs text-gray-500 mt-0.5 italic">"{po.notes}"</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {waUrl && (
                          <a href={waUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-emerald-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                            Send PO via WhatsApp
                          </a>
                        )}
                        {canProgress && nextStatus[po.status] && (
                          <button onClick={() => handleStatusChange(po, nextStatus[po.status])}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                            Mark {nextStatus[po.status]}
                            {nextStatus[po.status] === 'RECEIVED' && ' + Restock'}
                          </button>
                        )}
                        {canProgress && (
                          <button onClick={() => handleStatusChange(po, 'CANCELLED')}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PO items */}
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <div className="space-y-1">
                        {po.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">{item.itemName} — {item.quantity} {item.unit}</span>
                            <span className="text-gray-500">{formatCurrency(item.unitPrice)}/{item.unit} = <strong className="text-gray-700">{formatCurrency(item.totalPrice)}</strong></span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs font-bold">
                        <span className="text-gray-600">Total</span>
                        <span className="text-gray-800">{formatCurrency(po.totalAmount ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VendorPage
