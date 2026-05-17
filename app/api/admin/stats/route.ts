import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

function isAuthorized(req: NextRequest) {
  return req.headers.get('Authorization')?.replace('Bearer ', '') === process.env.STAFF_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  // Expect YYYY-MM-DD. Treat as Bahrain local time (UTC+3).
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const dayStart = `${date}T00:00:00+03:00`
  const dayEnd   = `${date}T23:59:59.999+03:00`

  const sb = getServiceClient()
  const { data: orders, error } = await sb
    .from('orders')
    .select('id, order_number, total, items, created_at, status')
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalRevenue = (orders ?? []).reduce((s, o) => s + Number(o.total), 0)
  const orderCount   = orders?.length ?? 0

  // Aggregate item quantities and revenue across all orders
  const itemMap: Record<string, { name_en: string; name_ar: string; qty: number; revenue: number }> = {}
  for (const order of orders ?? []) {
    for (const item of order.items as Array<{ id: string; name_en: string; name_ar: string; price: number; qty: number }>) {
      if (!itemMap[item.id]) {
        itemMap[item.id] = { name_en: item.name_en, name_ar: item.name_ar, qty: 0, revenue: 0 }
      }
      itemMap[item.id].qty     += item.qty
      itemMap[item.id].revenue += item.qty * Number(item.price)
    }
  }

  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty)

  return NextResponse.json({ date, totalRevenue, orderCount, topItems })
}
