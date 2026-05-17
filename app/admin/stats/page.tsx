'use client'

import { useState, useEffect, useCallback } from 'react'

type ItemStat = { name_en: string; name_ar: string; qty: number; revenue: number }

type Stats = {
  date: string
  totalRevenue: number
  orderCount: number
  topItems: ItemStat[]
}

function toLocalDateString(d: Date) {
  // YYYY-MM-DD in Bahrain local time (UTC+3)
  const offset = 3 * 60
  const local  = new Date(d.getTime() + offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const today     = toLocalDateString(new Date())
  const yesterday = shiftDate(today, -1)
  if (dateStr === today)     return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export default function StatsPage() {
  const [authed,   setAuthed]   = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [date,     setDate]     = useState(() => toLocalDateString(new Date()))
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

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
    if (res.ok) { sessionStorage.setItem('staff_pass', password); setAuthed(true) }
    else setAuthError('Incorrect password')
  }

  const fetchStats = useCallback(async (d: string) => {
    setLoading(true)
    setError('')
    const p = sessionStorage.getItem('staff_pass') || password
    const res = await fetch(`/api/admin/stats?date=${d}`, {
      headers: { Authorization: `Bearer ${p}` },
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to load'); setLoading(false); return }
    setStats(data)
    setLoading(false)
  }, [password])

  useEffect(() => {
    if (authed) fetchStats(date)
  }, [authed, date, fetchStats])

  const go = (days: number) => {
    const next = shiftDate(date, days)
    if (next > toLocalDateString(new Date())) return  // don't go into the future
    setDate(next)
  }

  const today = toLocalDateString(new Date())

  // ── Password gate ─────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Admin Login</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Staff password" autoFocus
            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gray-900" />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium">Login</button>
        </form>
      </div>
    )
  }

  // ── Stats page ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/admin" className="text-gray-400 hover:text-white text-sm transition">← Menu</a>
          <h1 className="text-lg font-bold">Daily Sales</h1>
        </div>
        <button onClick={() => { sessionStorage.removeItem('staff_pass'); setAuthed(false) }}
          className="text-sm text-gray-400 hover:text-white transition">
          Logout
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Date navigator */}
        <div className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 shadow-sm">
          <button onClick={() => go(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg transition">
            ‹
          </button>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">{formatDate(date)}</span>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => e.target.value && setDate(e.target.value)}
              className="text-xs text-gray-400 border-0 bg-transparent cursor-pointer focus:outline-none"
            />
          </div>
          <button onClick={() => go(1)} disabled={date >= today}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-lg transition disabled:opacity-30">
            ›
          </button>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500 text-sm">{error}</div>
        )}

        {!loading && stats && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Revenue</p>
                <p className="text-3xl font-black text-gray-900">{Number(stats.totalRevenue).toFixed(3)}</p>
                <p className="text-sm text-gray-400 mt-0.5">BD</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Orders</p>
                <p className="text-3xl font-black text-gray-900">{stats.orderCount}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {stats.orderCount > 0
                    ? `avg ${(Number(stats.totalRevenue) / stats.orderCount).toFixed(3)} BD`
                    : 'no orders'}
                </p>
              </div>
            </div>

            {/* Item breakdown */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Items sold</h2>
              </div>
              {stats.topItems.length === 0 ? (
                <p className="text-center py-10 text-gray-400 text-sm">No orders on this day.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.topItems.map((item, i) => {
                    const maxQty = stats.topItems[0].qty
                    const pct    = Math.round((item.qty / maxQty) * 100)
                    return (
                      <div key={item.name_en} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                            <span className="font-medium text-gray-900 text-sm truncate">{item.name_en}</span>
                            <span className="text-gray-400 text-xs truncate hidden sm:inline" dir="rtl">{item.name_ar}</span>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <span className="font-bold text-gray-900 text-sm">{item.qty}×</span>
                            <span className="text-gray-400 text-xs ml-2">{item.revenue.toFixed(3)} BD</span>
                          </div>
                        </div>
                        {/* Relative bar */}
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
