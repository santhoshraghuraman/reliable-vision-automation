/**
 * Row validation and deduplication logic
 */

import { ParsedRow, ValidatedRow, ImportPreviewData, ColumnMappingInfo } from './types'
import { normalizePhone, isValidPhone } from './phone-utils'

/**
 * Validate a single parsed row
 * A row is valid if:
 * - phone exists and is valid
 * - and either name or business exists
 */
export function validateRow(row: ParsedRow): string[] {
  const errors: string[] = []

  const effectiveName = row.name?.trim() || row.business?.trim() || ''

  if (!effectiveName) {
    errors.push('Missing name or business name')
  }

  if (!row.phone || row.phone.trim() === '') {
    errors.push('Missing phone number')
  } else {
    const normalized = normalizePhone(row.phone)
    if (!isValidPhone(normalized)) {
      errors.push(`Invalid phone number: "${row.phone}"`)
    }
  }

  return errors
}

/**
 * Deduplicate within the uploaded file (by normalized phone number)
 * The FIRST occurrence is kept as valid; subsequent ones are marked as duplicate_file
 */
export function deduplicateWithinFile(rows: ParsedRow[]): ValidatedRow[] {
  const seenPhones = new Map<string, number>() // normalized phone → first row index

  return rows.map((row) => {
    const errors = validateRow(row)
    const normalizedPhone = normalizePhone(row.phone)

    if (errors.length > 0) {
      return { ...row, validationStatus: 'invalid', errors }
    }

    if (seenPhones.has(normalizedPhone)) {
      return {
        ...row,
        validationStatus: 'duplicate_file',
        errors: [`Duplicate phone in this file (first seen at row ${(seenPhones.get(normalizedPhone) ?? 0)})`],
      }
    }

    seenPhones.set(normalizedPhone, row._rowIndex)
    return { ...row, validationStatus: 'valid', errors: [] }
  })
}

/**
 * Check Supabase for existing phone numbers via the server-side API route
 * Marks rows as duplicate_db if the phone already exists in the leads table
 */
export async function checkSupabaseDuplicates(
  rows: ValidatedRow[]
): Promise<ValidatedRow[]> {
  // Only check rows that are currently 'valid'
  const validRows = rows.filter((r) => r.validationStatus === 'valid')
  if (validRows.length === 0) return rows

  const phones = validRows.map((r) => normalizePhone(r.phone))

  try {
    const res = await fetch('/api/leads/check-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones }),
    })

    if (!res.ok) {
      console.warn('[checkSupabaseDuplicates] API response not ok, skipping DB check')
      return rows
    }

    const { existingPhones = [] } = (await res.json()) as { existingPhones: string[] }
    const existingSet = new Set(existingPhones.map((p) => normalizePhone(p)))

    return rows.map((row) => {
      if (row.validationStatus !== 'valid') return row
      const normalized = normalizePhone(row.phone)
      if (existingSet.has(normalized)) {
        return {
          ...row,
          validationStatus: 'duplicate_db',
          errors: ['Phone number already exists in the CRM database'],
        }
      }
      return row
    })
  } catch (err) {
    console.error('[checkSupabaseDuplicates] Error:', err)
    return rows
  }
}

/**
 * Build the ImportPreviewData summary from validated rows
 */
export function buildImportPreview(
  rows: ValidatedRow[],
  columnMapping?: ColumnMappingInfo
): ImportPreviewData {
  const valid = rows.filter((r) => r.validationStatus === 'valid')
  const duplicatesInFile = rows.filter((r) => r.validationStatus === 'duplicate_file')
  const duplicatesInDb = rows.filter((r) => r.validationStatus === 'duplicate_db')
  const invalid = rows.filter((r) => r.validationStatus === 'invalid')

  return {
    total: rows.length,
    valid,
    duplicatesInFile,
    duplicatesInDb,
    invalid,
    columnMapping,
  }
}
