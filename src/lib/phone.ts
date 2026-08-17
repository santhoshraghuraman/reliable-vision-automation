/**
 * Normalizes phone numbers to standard format (e.g. +919876543210)
 * Prevents duplicate leads caused by variations in formatting like spaces, dashes, or brackets.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit and non-plus characters
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If phone starts with 0 or doesn't have country code, format for India (+91)
  if (cleaned.startsWith('0')) {
    cleaned = '+91' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}
