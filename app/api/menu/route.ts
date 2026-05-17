import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return token === process.env.STAFF_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sb = getServiceClient()
  const { data, error } = await sb
    .from('menu_items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { name_en, name_ar, price, image_url, available } = await req.json()
    if (!name_en || !name_ar || price == null) {
      return NextResponse.json({ error: 'name_en, name_ar, and price are required' }, { status: 400 })
    }
    const sb = getServiceClient()
    const { data, error } = await sb
      .from('menu_items')
      .insert({ name_en, name_ar, price, image_url: image_url || null, available: available ?? true })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ item: data })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
