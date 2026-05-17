import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  return token === process.env.STAFF_PASSWORD
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const sb = getServiceClient()
    const { error } = await sb.from('menu_items').update(body).eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
