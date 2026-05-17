'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Order } from '@/lib/types'

const PAGE_SIZE = 20

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready:     'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-500',
}

export default function OrderHistoryPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

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

  const fetchPage = useCallback(async (pageIndex: number) => {
    setLoading(true)
    const p = sessionStorage.getItem('staff_pass') || password
    const res = await fetch(`/api/orders/history?page=${pageIndex}&limit=${PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${p}` },
    })
    const data = await res.json()
    const rows: Order[] = data.orders ?? []
    if (pageIndex === 0) {
      setOrders(rows)
    } else {
      setOrders(prev => [...prev, ...rows])
    }
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }, [password])

  useEffect(() => {
    if (authed) fetchPage(0)
  }, [authed, fetchPage])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    fetchPage(next)
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
          <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium">
            Login
          </button>
        </form>
      </div>
    )
  }

  // ── Order history ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-gray-400 hover:text-white text-sm transition">← Menu</a>
          <h1 className="text-lg font-bold">Order History</h1>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('staff_pass'); setAuthed(false) }}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Logout
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-3">
        {loading && orders.length === 0 && (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        )}

        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-gray-900">#{order.order_number}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGE[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {order.status}
                </span>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{Number(order.total).toFixed(3)} BD</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(order.created_at).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <ul className="mt-2 space-y-0.5">
              {(order.items as Array<{ qty: number; name_en: string; name_ar: string; price: number }>).map((it, i) => (
                <li key={i} className="text-sm text-gray-600 flex justify-between">
                  <span>{it.qty}× {it.name_en}</span>
                  <span className="text-gray-400">{(it.qty * it.price).toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hasMore && !loading && (
          <button
            onClick={loadMore}
            className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Load more
          </button>
        )}

        {loading && orders.length > 0 && (
          <p className="text-center text-sm text-gray-400 py-4">Loading…</p>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16 text-gray-400">No orders yet.</div>
        )}
      </div>
    </div>
  )
}
