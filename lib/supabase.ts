import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Anon client — safe for both server components and browser bundles
export const supabase = createClient(url, anon)

// Service-role client — server-only; SUPABASE_SERVICE_ROLE_KEY is never in the browser bundle
export function getServiceClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}
