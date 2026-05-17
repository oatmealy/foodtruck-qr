import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { items, total } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 })
    }

    const sb = getServiceClient()

    const { data: orderNum, error: seqErr } = await sb.rpc('next_order_number')
    if (seqErr) throw seqErr

    const { data, error } = await sb
      .from('orders')
      .insert({ order_number: orderNum, items, total })
      .select('order_number')
      .single()

    if (error) throw error
    return NextResponse.json({ order_number: data.order_number })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
