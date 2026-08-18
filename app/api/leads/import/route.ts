/**
 * POST /api/leads/import
 * Secure server-side endpoint for importing leads from Excel
 * Uses the Supabase service role key — NEVER exposed to the browser
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ImportResult } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'
import { dispatchToN8n } from '@/services/webhook.service'
import crypto from 'crypto'

interface LeadInsert {
  name: string
  phone: string
  business: string | null
  category: string | null
  requirement?: string | null
  status: 'COLD'
  source: 'excel'
  is_eligible: boolean
  opted_out: boolean
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { leads } = body as { leads: LeadInsert[] }

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads provided for import.' },
        { status: 400 }
      )
    }

    // Validate each lead has required fields
    for (const lead of leads) {
      if (!lead.name || !lead.phone) {
        return NextResponse.json(
          { error: 'Each lead must have a name and phone.' },
          { status: 400 }
        )
      }
    }

    // Insert in batches of 100 to avoid payload limits
    const batchSize = 100
    let imported = 0
    const errors: string[] = []
    const importedLeadIds: string[] = []

    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize)

      const { data, error } = await getSupabaseAdmin()
        .from('leads')
        .insert(batch)
        .select('id')

      if (error) {
        console.error('[Import API] Batch insert error:', error)
        errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${error.message}`)
      } else {
        imported += data?.length ?? 0
        if (data) {
          importedLeadIds.push(...data.map((d) => d.id))
        }
      }
    }

    if (imported > 0 && importedLeadIds.length > 0) {
      // Fire-and-forget webhook dispatch to n8n
      dispatchToN8n('lead_imported', {
        batchId: crypto.randomUUID(),
        importedCount: imported,
        leadIds: importedLeadIds,
      })
    }

    const result: ImportResult = {
      imported,
      failed: leads.length - imported,
      errors,
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    console.error('[Import API] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error during import.' },
      { status: 500 }
    )
  }
}
