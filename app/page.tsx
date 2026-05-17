import { createClient } from '@supabase/supabase-js'
import MenuClient from '@/components/MenuClient'
import type { MenuItem } from '@/lib/types'

export const revalidate = 30

async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await sb
      .from('menu_items')
      .select('*')
      .eq('available', true)
      .order('created_at')
    return data ?? []
  } catch {
    return []
  }
}

export default async function HomePage() {
  const items = await getMenuItems()
  return <MenuClient initialItems={items} />
}
