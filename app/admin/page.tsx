'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MenuItem } from '@/lib/types'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name_en: '', name_ar: '', price: '', image_url: '', available: true,
  })

  useEffect(() => {
    const p = sessionStorage.getItem('staff_pass')
    if (p) { setPassword(p); setAuthed(true) }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      sessionStorage.setItem('staff_pass', password)
      setAuthed(true)
      setAuthError('')
    } else {
      setAuthError('Incorrect password')
    }
  }

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const p = sessionStorage.getItem('staff_pass') || password
    const res = await fetch('/api/menu', { headers: { Authorization: `Bearer ${p}` } })
    const data = await res.json()
    setItems(data.items ?? [])
    setLoading(false)
  }, [password])

  useEffect(() => {
    if (authed) fetchItems()
  }, [authed, fetchItems])

  const toggleAvailable = async (item: MenuItem) => {
    const p = sessionStorage.getItem('staff_pass') || password
    await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p}` },
      body: JSON.stringify({ available: !item.available }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i))
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name_en || !form.name_ar || !form.price) return
    setAdding(true)
    const p = sessionStorage.getItem('staff_pass') || password
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p}` },
      body: JSON.stringify({
        name_en: form.name_en,
        name_ar: form.name_ar,
        price: parseFloat(form.price),
        image_url: form.image_url || null,
        available: form.available,
      }),
    })
    const data = await res.json()
    if (data.item) {
      setItems(prev => [data.item, ...prev])
      setForm({ name_en: '', name_ar: '', price: '', image_url: '', available: true })
      setShowForm(false)
    }
    setAdding(false)
  }

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Staff password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoFocus
          />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition">
            Login
          </button>
        </form>
      </div>
    )
  }

  // ── Admin panel ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Menu Management</h1>
        <div className="flex items-center gap-4">
          <a
            href="/admin/stats"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
          >
            Daily sales
          </a>
          <a
            href="/admin/orders"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
          >
            Order history
          </a>
          <button
            onClick={() => setShowForm(s => !s)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition"
          >
            {showForm ? 'Cancel' : '+ Add item'}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('staff_pass'); setAuthed(false) }}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {/* Add item form */}
        {showForm && (
          <form onSubmit={addItem} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-gray-900">New Menu Item</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name (English)</label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))}
                  placeholder="Machboos"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">الاسم (عربي)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={form.name_ar}
                  onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                  placeholder="مجبوس"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Price (BD)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="2.500"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Image URL</label>
                <input
                  type="url"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.available}
                onChange={e => setForm(f => ({ ...f, available: e.target.checked }))}
                className="rounded"
              />
              Available on menu
            </label>
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-gray-800 transition"
            >
              {adding ? 'Adding…' : 'Add item'}
            </button>
          </form>
        )}

        {/* Items list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No menu items yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div
                key={item.id}
                className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 transition ${!item.available ? 'opacity-50' : ''}`}
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-2xl shrink-0">🥘</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.name_en}</p>
                  <p className="text-gray-400 text-xs" dir="rtl">{item.name_ar}</p>
                  <p className="text-green-700 font-bold text-sm">{Number(item.price).toFixed(3)} BD</p>
                </div>
                <button
                  onClick={() => toggleAvailable(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition shrink-0 ${
                    item.available
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {item.available ? 'Available' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
