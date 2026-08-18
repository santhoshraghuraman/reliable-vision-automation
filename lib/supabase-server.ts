import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side Supabase client — NEVER import this in client components
// Uses the service role key for privileged operations (e.g., inserting leads)
// This file must only be used in:
//   - app/api/** route handlers
//   - Server Components (if needed in the future)

let _client: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing server-side Supabase environment variables. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    )
  }

  _client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return _client
}

// Export as a getter so the client is only created when first used
export { getSupabaseAdmin }
