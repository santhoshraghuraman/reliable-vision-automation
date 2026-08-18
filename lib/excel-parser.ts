/**
 * Excel/CSV parser for lead import
 * Supports .xlsx, .xls, .csv
 * Flexible header normalization with alias matching
 * Handles fallback of Name from Business Name when Contact Name is not present
 */

import * as XLSX from 'xlsx'
import { ParsedRow, ColumnMappingInfo } from './types'

/**
 * Known column name mappings (normalized target -> accepted aliases)
 */
const FIELD_ALIASES: Record<string, string[]> = {
  name: [
    'name',
    'contact name',
    'person name',
    'customer name',
    'lead name',
    'full name',
    'fullname',
    'first name',
    'firstname',
    'client name',
    'owner name',
    'contact',
  ],
  phone: [
    'phone',
    'phone number',
    'phonenumber',
    'phone no',
    'phoneno',
    'phone num',
    'mobile',
    'mobile number',
    'mobilenumber',
    'mobile no',
    'mobileno',
    'whatsapp',
    'whatsapp number',
    'whatsappno',
    'whatsappnumber',
    'contact number',
    'contactnumber',
    'contact no',
    'telephone',
    'tel',
    'cell',
    'cellphone',
  ],
  business: [
    'business',
    'business name',
    'businessname',
    'company',
    'company name',
    'companyname',
    'organization',
    'organization name',
    'org name',
    'firm',
    'firm name',
    'shop',
    'shop name',
    'store',
    'store name',
    'enterprise',
    'establishment',
    'agency',
  ],
  category: [
    'category',
    'business category',
    'category name',
    'industry',
    'industry name',
    'type',
    'business type',
    'segment',
    'sector',
    'niche',
    'domain',
  ],
  requirement: [
    'requirement',
    'requirements',
    'why this business needs a website',
    'website need',
    'needs',
    'pitch',
    'suggested pitch',
    'notes',
    'note',
    'description',
    'details',
    'remarks',
    'remark',
  ],
}

/**
 * Clean and normalize header string:
 * - lowercase
 * - replaces hyphens, underscores, dots with spaces
 * - removes punctuation
 * - collapses multiple spaces
 */
export function cleanHeaderString(raw: string): string {
  if (!raw) return ''
  return raw
    .toString()
    .toLowerCase()
    .replace(/[-_.]+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Match a raw header string to one of our target field names
 */
function matchFieldHeader(rawHeader: string): string | null {
  const cleaned = cleanHeaderString(rawHeader)
  if (!cleaned) return null

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => alias === cleaned)) {
      return field
    }
  }

  return null
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: string[]
  detectedColumns: string[]
  missingRequiredColumns: string[]
  columnMapping: ColumnMappingInfo
}

/**
 * Parse an Excel/CSV file buffer and return structured rows
 */
export function parseExcelBuffer(buffer: ArrayBuffer): ParseResult {
  const emptyMapping: ColumnMappingInfo = {
    nameHeader: null,
    phoneHeader: null,
    businessHeader: null,
    categoryHeader: null,
    nameFallbackFromBusiness: false,
    extraColumns: [],
  }

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, { type: 'array' })
  } catch {
    return {
      rows: [],
      errors: ['Failed to read file. Please ensure the file is a valid Excel (.xlsx, .xls) or CSV file.'],
      detectedColumns: [],
      missingRequiredColumns: ['phone', 'name/business'],
      columnMapping: emptyMapping,
    }
  }

  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return {
      rows: [],
      errors: ['The file appears to be empty (no sheets found).'],
      detectedColumns: [],
      missingRequiredColumns: ['phone', 'name/business'],
      columnMapping: emptyMapping,
    }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: '',
  })

  if (rawData.length === 0) {
    return {
      rows: [],
      errors: ['The Excel file is empty. Please upload a file with at least one data row.'],
      detectedColumns: [],
      missingRequiredColumns: ['phone', 'name/business'],
      columnMapping: emptyMapping,
    }
  }

  // Detect and map headers from first row
  const rawHeaders = Object.keys(rawData[0])
  const headerMap: Record<string, string> = {} // rawHeader -> targetField
  const mappedRawHeaders = new Set<string>()

  // 1. First pass: prioritize phone, business, category, requirement, name
  for (const rawHeader of rawHeaders) {
    const target = matchFieldHeader(rawHeader)
    if (target && !Object.values(headerMap).includes(target)) {
      headerMap[rawHeader] = target
      mappedRawHeaders.add(rawHeader)
    }
  }

  // Check if Phone was detected
  const phoneHeader = Object.keys(headerMap).find((k) => headerMap[k] === 'phone') ?? null
  const nameHeader = Object.keys(headerMap).find((k) => headerMap[k] === 'name') ?? null
  const businessHeader = Object.keys(headerMap).find((k) => headerMap[k] === 'business') ?? null
  const categoryHeader = Object.keys(headerMap).find((k) => headerMap[k] === 'category') ?? null
  const requirementHeader = Object.keys(headerMap).find((k) => headerMap[k] === 'requirement') ?? null

  const extraColumns = rawHeaders.filter((h) => !mappedRawHeaders.has(h))

  // Determine if Name will fallback from Business Name
  const nameFallbackFromBusiness = !nameHeader && !!businessHeader

  const missingRequiredColumns: string[] = []
  if (!phoneHeader) {
    missingRequiredColumns.push('Phone Number')
  }
  if (!nameHeader && !businessHeader) {
    missingRequiredColumns.push('Name or Business Name')
  }

  const columnMapping: ColumnMappingInfo = {
    nameHeader,
    phoneHeader,
    businessHeader,
    categoryHeader,
    nameFallbackFromBusiness,
    extraColumns,
  }

  if (missingRequiredColumns.length > 0) {
    return {
      rows: [],
      errors: [
        `Missing required columns: ${missingRequiredColumns.join(', ')}. ` +
        `Detected headers: ${rawHeaders.join(', ')}. ` +
        `Please ensure the spreadsheet has a Phone Number column and either a Contact Name or Business Name.`
      ],
      detectedColumns: rawHeaders,
      missingRequiredColumns,
      columnMapping,
    }
  }

  // Map each data row
  const rows: ParsedRow[] = []

  rawData.forEach((rawRow, index) => {
    const rawName = nameHeader ? rawRow[nameHeader]?.toString().trim() ?? '' : ''
    const rawBusiness = businessHeader ? rawRow[businessHeader]?.toString().trim() ?? '' : ''
    const rawPhone = phoneHeader ? rawRow[phoneHeader]?.toString().trim() ?? '' : ''
    const rawCategory = categoryHeader ? rawRow[categoryHeader]?.toString().trim() ?? '' : ''
    const rawRequirement = requirementHeader ? rawRow[requirementHeader]?.toString().trim() ?? '' : ''

    // Name fallback rule: if no explicit contact name, use business name
    const effectiveName = rawName || rawBusiness || ''

    // Collect all extra columns into extra_data
    const extra_data: Record<string, string> = {}
    for (const extraCol of extraColumns) {
      const val = rawRow[extraCol]?.toString().trim() ?? ''
      if (val) {
        extra_data[extraCol] = val
      }
    }

    // If requirement is empty, build a concise requirement note from relevant extra columns
    let finalRequirement = rawRequirement
    if (!finalRequirement) {
      const requirementParts: string[] = []
      if (extra_data['Why this business needs a website']) {
        requirementParts.push(`Need: ${extra_data['Why this business needs a website']}`)
      }
      if (extra_data['Suggested Pitch']) {
        requirementParts.push(`Pitch: ${extra_data['Suggested Pitch']}`)
      }
      if (extra_data['Website Status']) {
        requirementParts.push(`Website Status: ${extra_data['Website Status']}`)
      }
      if (extra_data['Priority']) {
        requirementParts.push(`Priority: ${extra_data['Priority']}`)
      }
      if (extra_data['Estimated Chance of Closing']) {
        requirementParts.push(`Chance: ${extra_data['Estimated Chance of Closing']}`)
      }
      if (extra_data['Address']) {
        requirementParts.push(`Address: ${extra_data['Address']}`)
      }
      if (requirementParts.length > 0) {
        finalRequirement = requirementParts.join(' | ')
      }
    }

    rows.push({
      name: effectiveName,
      phone: rawPhone,
      business: rawBusiness,
      category: rawCategory,
      requirement: finalRequirement || undefined,
      extra_data,
      _rowIndex: index + 2, // 1-indexed, accounting for header row
    })
  })

  return {
    rows,
    errors: [],
    detectedColumns: rawHeaders,
    missingRequiredColumns: [],
    columnMapping,
  }
}
