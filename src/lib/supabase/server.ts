import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qumijqnkzfphsytwizkv.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createSupabaseJsClient(supabaseUrl, supabaseAnonKey);
}
