'use client'

import { useState, useEffect } from 'react'
import type { MenuItem } from '@/lib/types'

type CartItem = { item: MenuItem; qty: number }

export default function MenuClient({ initialItems }: { initialItems: MenuItem[] }) {
  const [ar, setAr] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [orderNum, setOrderNum] = useState<number | null>(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (localStorage.getItem('lang') === 'ar') setAr(true)
    try {
      const saved = localStorage.getItem('cart')
      if (saved) setCart(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.lang = ar ? 'ar' : 'en'
    document.documentElement.dir = ar ? 'rtl' : 'ltr'
    localStorage.setItem('lang', ar ? 'ar' : 'en')
  }, [ar])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const addItem = (item: MenuItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.item.id === item.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { item, qty: 1 }]
    })
  }

  const setQty = (id: string, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(c => c.item.id !== id))
    else setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty } : c))
  }

  const totalItems = cart.reduce((s, c) => s + c.qty, 0)
  const totalPrice = cart.reduce((s, c) => s + c.qty * c.item.price, 0)

  const placeOrder = async () => {
    if (!cart.length) return
    setPlacing(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(c => ({
            id: c.item.id,
            name_en: c.item.name_en,
            name_ar: c.item.name_ar,
            price: c.item.price,
            qty: c.qty,
          })),
          total: totalPrice,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place order')
      setOrderNum(data.order_number)
      setCart([])
      setCartOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setPlacing(false)
    }
  }

  // ── Order success screen ──────────────────────────────────────────────────
  if (orderNum) {
    return (
      <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="text-6xl mb-4">✓</div>
        <p className="text-xl opacity-80 mb-2">
          {ar ? 'رقم طلبك' : 'Your order number'}
        </p>
        <p className="font-black leading-none my-4" style={{ fontSize: 'clamp(80px,30vw,160px)' }}>
          {orderNum}
        </p>
        <p className="opacity-70 text-lg max-w-xs">
          {ar ? 'سيُنادى على رقمك عندما يكون جاهزاً' : "We'll call your number when ready"}
        </p>
        <button
          onClick={() => setOrderNum(null)}
          className="mt-10 px-8 py-3 bg-white/20 hover:bg-white/30 rounded-full font-medium transition"
        >
          {ar ? 'طلب جديد' : 'New order'}
        </button>
      </div>
    )
  }

  // ── Main menu ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">
            {ar ? '🍽️ قائمة الطعام' : '🍽️ Food Truck'}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAr(a => !a)}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              {ar ? 'English' : 'عربي'}
            </button>
            {totalItems > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition"
              >
                <span className="font-bold">{totalItems}</span>
                <span>{ar ? 'عرض السلة' : 'View cart'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Menu grid */}
      <main className="max-w-lg mx-auto p-4 grid grid-cols-2 gap-3 pb-24">
        {initialItems.map(item => (
          <button
            key={item.id}
            onClick={() => addItem(item)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition text-start"
          >
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={ar ? item.name_ar : item.name_en}
                className="w-full h-28 object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="w-full h-28 bg-amber-50 flex items-center justify-center text-5xl select-none">
                🥘
              </div>
            )}
            <div className="p-3">
              <p className="font-semibold text-gray-900 text-sm leading-tight">
                {ar ? item.name_ar : item.name_en}
              </p>
              <p className="text-green-700 font-bold text-sm mt-1">
                {Number(item.price).toFixed(3)} BD
              </p>
            </div>
          </button>
        ))}
      </main>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex flex-col">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-lg font-bold">
                {ar ? 'سلتك' : 'Your cart'}
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-3">
              {cart.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {ar ? item.name_ar : item.name_en}
                    </p>
                    <p className="text-xs text-gray-500">
                      {Number(item.price).toFixed(3)} BD
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setQty(item.id, qty - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center hover:bg-gray-200"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-semibold text-sm">{qty}</span>
                    <button
                      onClick={() => setQty(item.id, qty + 1)}
                      className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center hover:bg-green-200"
                    >
                      +
                    </button>
                  </div>
                  <p className="w-14 text-right font-semibold text-sm shrink-0">
                    {(qty * Number(item.price)).toFixed(3)}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-5 pb-8 pt-4 border-t">
              {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
              <div className="flex justify-between mb-4">
                <span className="font-bold text-lg">{ar ? 'المجموع' : 'Total'}</span>
                <span className="font-bold text-lg text-green-700">
                  {totalPrice.toFixed(3)} BD
                </span>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-lg rounded-2xl transition"
              >
                {placing
                  ? (ar ? 'جارٍ الطلب...' : 'Placing order...')
                  : (ar ? 'تأكيد الطلب' : 'Place order')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
