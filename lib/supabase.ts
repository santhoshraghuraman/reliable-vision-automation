import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Browser-side Supabase client
// Uses the anon/public key — safe to use in the browser
// Write operations go through Next.js API routes for security

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }

  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return _client
}

// Convenience export for backward compatibility
export const supabase = {
  from: (table: string) => getSupabaseClient().from(table),
  rpc: (fn: string, args?: Record<string, unknown>) => getSupabaseClient().rpc(fn, args),
  channel: (name: string) => getSupabaseClient().channel(name),
}
