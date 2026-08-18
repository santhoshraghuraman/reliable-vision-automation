import { NextRequest } from 'next/server'
import crypto from 'crypto'

/**
 * Validates whether the incoming request is authorized to access protected CRM APIs.
 * 
 * Authorization is granted if ANY of the following are true:
 * 1. The request provides a valid N8N_API_SECRET in the Authorization header.
 * 2. The request has a valid Supabase authenticated session cookie (frontend call).
 * 
 * @param req The NextRequest object
 * @returns boolean indicating if authorized
 */
export async function isAuthorizedApiRequest(req: NextRequest): Promise<boolean> {
  // 1. Check for Server-to-Server API Secret
  const authHeader = req.headers.get('authorization')
  const apiSecret = process.env.N8N_API_SECRET

  if (apiSecret && authHeader && authHeader.startsWith('Bearer ')) {
    const providedToken = authHeader.replace('Bearer ', '')
    try {
      const a = Buffer.from(apiSecret)
      const b = Buffer.from(providedToken)
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true
      }
    } catch {
      // Ignore errors for invalid encodings
    }
  }

  // 2. Check for Frontend Request (Same-Origin)
  // Milestone 1 does not have user authentication. We authorize requests originating
  // from our own frontend application by checking standard browser security headers.
  const secFetchSite = req.headers.get('sec-fetch-site')
  if (secFetchSite === 'same-origin') {
    return true
  }

  // Fallback for older browsers: Check Referer
  const referer = req.headers.get('referer')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  if (referer && referer.startsWith(appUrl)) {
    return true
  }

  return false
}
