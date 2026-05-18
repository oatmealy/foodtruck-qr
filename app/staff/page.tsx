'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/lib/types'

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

const NEXT_STATUS: Record<string, 'preparing' | 'ready' | 'completed'> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'completed',
}

const STATUS_META = {
  pending:   { label: 'Pending',   color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
  preparing: { label: 'Preparing', color: 'bg-blue-400/20 text-blue-300 border-blue-400/30' },
  ready:     { label: 'Ready',     color: 'bg-green-400/20 text-green-300 border-green-400/30' },
  completed: { label: 'Completed', color: 'bg-gray-400/20 text-gray-400 border-gray-400/30' },
}

export default function StaffPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const seen = useRef(new Set<string>())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore session
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

  const advanceStatus = async (order: Order) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    const p = sessionStorage.getItem('staff_pass') || password
    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p}` },
      body: JSON.stringify({ status: next }),
    })
    // Remove completed orders from local state immediately — Realtime UPDATE will also fire
    if (next === 'completed') {
      setOrders(prev => prev.filter(o => o.id !== order.id))
    }
  }

  const cancelOrder = async (order: Order) => {
    const p = sessionStorage.getItem('staff_pass') || password
    setOrders(prev => prev.filter(o => o.id !== order.id))
    await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p}` },
      body: JSON.stringify({ status: 'cancelled' }),
    })
  }

  // Fetch + Realtime subscription
  useEffect(() => {
    if (!authed) return
    setLoading(true)

    supabase
      .from('orders')
      .select('*')
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setOrders(data as Order[])
          data.forEach(o => seen.current.add(o.id))
        }
        setLoading(false)
      })

    // Use a unique channel name so stale channels from HMR/remounts don't conflict
    const channel = supabase
      .channel(`orders-staff-${Date.now()}`)
      .on<Order>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        ({ new: o }) => {
          if (!seen.current.has(o.id)) {
            seen.current.add(o.id)
            beep()
            setOrders(prev => [...prev, o])
          }
        }
      )
      .on<Order>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        ({ new: o }) => {
          if (o.status === 'completed' || o.status === 'cancelled') {
            setOrders(prev => prev.filter(existing => existing.id !== o.id))
          } else {
            setOrders(prev => prev.map(existing => existing.id === o.id ? o : existing))
          }
        }
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') {
          // Realtime connection failed — fall back to polling every 5 s
          pollRef.current = setInterval(async () => {
            const { data } = await supabase
              .from('orders')
              .select('*')
              .order('created_at', { ascending: false })
            if (data) setOrders(data as Order[])
          }, 5000)
        }
      })

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      supabase.removeChannel(channel)
    }
  }, [authed])

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-gray-900">Kitchen Login</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Staff password"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoFocus
          />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition"
          >
            Login
          </button>
        </form>
      </div>
    )
  }

  const grouped = {
    pending:   orders.filter(o => o.status === 'pending'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready:     orders.filter(o => o.status === 'ready'),
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h1 className="text-lg font-bold">Kitchen Dashboard</h1>
        <button
          onClick={() => { sessionStorage.removeItem('staff_pass'); setAuthed(false) }}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Logout
        </button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">Loading orders…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {(['pending', 'preparing', 'ready'] as const).map(status => {
            const meta = STATUS_META[status]
            const col = grouped[status]
            return (
              <div key={status} className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">{meta.label}</h2>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${meta.color}`}>
                    {col.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {col.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-8">No orders</p>
                  )}
                  {col.map(order => (
                    <div key={order.id} className="bg-gray-700 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-green-400">
                          #{order.order_number}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <ul className="text-sm text-gray-300 space-y-0.5">
                        {(order.items as Array<{ qty: number; name_en: string; addons?: Array<{ name_en: string }> }>).map((it, i) => (
                          <li key={i}>
                            {it.qty}× {it.name_en}
                            {it.addons && it.addons.length > 0 && (
                              <span className="text-gray-400 text-xs"> ({it.addons.map(a => a.name_en).join(', ')})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {order.notes && (
                        <p className="text-xs text-amber-300 bg-amber-400/10 rounded-lg px-2 py-1.5 border border-amber-400/20">
                          📝 {order.notes}
                        </p>
                      )}
                      <p className="text-sm font-bold text-green-400 pt-1 border-t border-white/10">
                        {Number(order.total).toFixed(3)} BD
                      </p>
                      {NEXT_STATUS[order.status] && (
                        <button
                          onClick={() => advanceStatus(order)}
                          className={`w-full mt-1 py-2 text-white text-sm font-semibold rounded-lg transition ${
                            NEXT_STATUS[order.status] === 'completed'
                              ? 'bg-gray-600 hover:bg-gray-500'
                              : 'bg-green-600 hover:bg-green-500'
                          }`}
                        >
                          {NEXT_STATUS[order.status] === 'completed'
                            ? 'Done — Remove ✓'
                            : `Mark as ${STATUS_META[NEXT_STATUS[order.status]].label} →`}
                        </button>
                      )}
                      <button
                        onClick={() => cancelOrder(order)}
                        className="w-full py-2 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 text-sm font-semibold rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
