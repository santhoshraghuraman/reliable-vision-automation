/**
 * Phone number utilities
 * Normalizes phone numbers for storage and comparison
 * Preserves international format (e.g. +91 prefix) when provided
 */

/**
 * Strip formatting characters from a phone number.
 * Removes spaces, hyphens, parentheses.
 * Does NOT strip country codes.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return ''
  // Remove spaces, hyphens, parentheses, dots
  let normalized = raw.toString().replace(/[\s\-().]/g, '').trim()
  
  // If exactly 10 digits and no '+' prefix, assume it's a local number and append default country code
  if (/^\d{10}$/.test(normalized)) {
    const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+91'
    normalized = `${defaultCountryCode}${normalized}`
  }
  
  return normalized
}

/**
 * Validate a normalized phone number.
 * Accepts:
 *   - 10-digit local numbers: 9876543210
 *   - International format: +919876543210
 *   - Other international: +12025551234
 * Returns true if the phone looks valid.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false
  const normalized = normalizePhone(phone)
  // Must be digits (and optionally start with +)
  // Must be between 7 and 15 digits (E.164 max is 15)
  const e164Pattern = /^\+?[1-9]\d{6,14}$/
  return e164Pattern.test(normalized)
}

/**
 * Format phone for display
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '—'
  return phone
}
