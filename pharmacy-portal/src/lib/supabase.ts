import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** With no Supabase settings the app runs on fictional in-memory data. */
export const isDemo = !url || !key

export const supabase: SupabaseClient | null = isDemo
  ? null
  : createClient(url as string, key as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })

export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}
