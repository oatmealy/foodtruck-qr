import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

const VALID_STATUSES = ['pending', 'preparing', 'ready']

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
    const { status } = await req.json()
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const sb = getServiceClient()
    const { error } = await sb.from('orders').update({ status }).eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
