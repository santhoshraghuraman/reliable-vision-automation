/**
 * Supabase Service Role Client — SERVER SIDE ONLY
 *
 * Uses the SERVICE_ROLE_KEY which bypasses RLS policies.
 * MUST NEVER be used in client-side code.
 * ONLY for API routes (webhook, cron, AI processing).
 *
 * The service role key is required for the WhatsApp webhook receiver
 * because incoming webhooks from Meta do NOT carry a Supabase JWT session.
 */
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[Supabase Service Client] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Add these to .env.local. Get service_role key from Supabase Dashboard → Settings → API.'
    );
  }

  return createSupabaseJsClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
