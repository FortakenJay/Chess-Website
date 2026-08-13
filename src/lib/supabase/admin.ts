import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function getServiceClient(): SupabaseClient<Database> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (and project URL) for server sync')
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
