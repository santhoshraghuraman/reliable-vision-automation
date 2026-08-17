/**
 * Shared server-side Supabase session authentication utility.
 *
 * Accepts the user's JWT from:
 *   1. Authorization: Bearer <token>  (primary — used by API clients)
 *   2. Supabase session cookies        (fallback — used by browser clients)
 *
 * Validates the token with supabase.auth.getUser(token) — a real
 * cryptographic verification against the Supabase Auth server.
 * Cookie PRESENCE ALONE is never accepted as proof of identity.
 *
 * Returns the authenticated User object, or null if the session is
 * missing, invalid, or expired.
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
  : '';

export async function getValidUser(request: NextRequest) {
  const supabase = createServerSupabaseClient();

  // 1. Try Authorization header first (standard API client pattern)
  let token: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Fallback: extract JWT from Supabase session cookies (browser client pattern)
  if (!token) {
    const cookies = request.cookies.getAll();
    for (const cookie of cookies) {
      const name = cookie.name.toLowerCase();

      // Supabase v2 simple access token cookie
      if (name === 'sb-access-token' || name === 'sb-auth') {
        token = cookie.value;
        break;
      }

      // Supabase v2 chunked auth cookie: sb-<ref>-auth-token
      if (SUPABASE_PROJECT_REF && name.startsWith(`sb-${SUPABASE_PROJECT_REF}-auth-token`)) {
        try {
          let val = cookie.value;
          if (val.includes('%')) val = decodeURIComponent(val);
          if (val.startsWith('base64-')) {
            val = Buffer.from(val.replace('base64-', ''), 'base64').toString('utf-8');
          }
          const parsed = JSON.parse(val);
          // Supabase v2 stores session as [access_token, refresh_token, ...]
          if (Array.isArray(parsed) && parsed.length > 0) {
            token = parsed[0];
            break;
          }
        } catch {
          // Malformed cookie — ignore and try next
        }
      }
    }
  }

  if (!token) return null;

  // 3. Cryptographic verification — the only valid proof of identity
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.warn('[Auth] Session rejected:', error?.message ?? 'No user returned');
    return null;
  }

  return user;
}
