/**
 * Campaigns Service
 * Manages campaigns lifecycle, lead segment filtering, and metadata sync with Supabase.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getSupabaseClient } from '@/lib/supabase'
import { Campaign, CampaignMetadata, Lead } from '@/lib/types'

/**
 * Helper to parse campaign metadata safely from message_template JSON
 */
export function parseCampaignRecord(record: Record<string, unknown>): Campaign {
  let meta: CampaignMetadata = {}
  if (record.message_template && typeof record.message_template === 'string') {
    try {
      meta = JSON.parse(record.message_template)
    } catch {
      meta = { template: record.message_template }
    }
  }

  return {
    id: record.id as string,
    name: record.name as string,
    description: (record.description as string) || null,
    status: (record.status as Campaign['status']) || 'draft',
    message_template: (record.message_template as string) || null,
    filter_category: meta.filter_category || (record.filter_category as string) || null,
    filter_status: meta.filter_status || (record.filter_status as string) || null,
    selected_lead_ids: meta.selected_lead_ids,
    rate_per_minute: meta.rate_per_minute || (record.rate_per_minute as number) || 3,
    target_count: (record.target_count as number) ?? meta.target_count ?? 0,
    sent_count: (record.sent_count as number) ?? meta.sent_count ?? 0,
    delivered_count: (record.delivered_count as number) ?? meta.delivered_count ?? 0,
    failed_count: (record.failed_count as number) ?? meta.failed_count ?? 0,
    read_count: (record.read_count as number) ?? meta.read_count ?? 0,
    replied_count: (record.replied_count as number) ?? meta.replied_count ?? 0,
    started_at: (record.started_at as string) || null,
    completed_at: (record.completed_at as string) || null,
    created_at: record.created_at as string,
    updated_at: record.updated_at as string,
  }
}

/**
 * Fetch all campaigns
 */
export async function getCampaigns(): Promise<{ campaigns: Campaign[]; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return { campaigns: [], error: error.message }
    const list = (data || []).map((row) => parseCampaignRecord(row as Record<string, unknown>))
    return { campaigns: list, error: null }
  } catch (err) {
    return { campaigns: [], error: (err as Error).message }
  }
}

/**
 * Fetch a single campaign by ID
 */
export async function getCampaignById(id: string): Promise<{ campaign: Campaign | null; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return { campaign: null, error: error?.message || 'Campaign not found' }
    return { campaign: parseCampaignRecord(data as Record<string, unknown>), error: null }
  } catch (err) {
    return { campaign: null, error: (err as Error).message }
  }
}

/**
 * Create a new campaign record with filters and metadata
 */
export async function createCampaign(params: {
  name: string
  description?: string
  filterCategory?: string
  filterStatus?: string
  ratePerMinute?: number
  targetCount?: number
  template?: string
  selectedLeadIds?: string[]
}): Promise<{ campaign: Campaign | null; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()

    const meta: CampaignMetadata = {
      filter_category: params.filterCategory || null,
      filter_status: params.filterStatus || 'ALL',
      selected_lead_ids: params.selectedLeadIds,
      rate_per_minute: params.ratePerMinute || 3,
      target_count: params.targetCount || 0,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      template: params.template || null,
    }

    const payload: Record<string, unknown> = {
      name: params.name,
      description: params.description || `Target: ${params.filterCategory || 'All Categories'} (${params.filterStatus || 'All'})`,
      status: 'draft',
      message_template: JSON.stringify(meta),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert(payload)
      .select()
      .single()

    if (error || !data) {
      return { campaign: null, error: error?.message || 'Failed to create campaign' }
    }

    return { campaign: parseCampaignRecord(data as Record<string, unknown>), error: null }
  } catch (err) {
    return { campaign: null, error: (err as Error).message }
  }
}

/**
 * Update campaign execution status and live progress counts
 */
export async function updateCampaignProgress(
  id: string,
  updates: {
    status?: Campaign['status']
    sent_count?: number
    delivered_count?: number
    failed_count?: number
    started_at?: string
    completed_at?: string
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch existing
    const { data: existing } = await supabase.from('campaigns').select('*').eq('id', id).single()
    if (!existing) return { success: false, error: 'Campaign not found' }

    let meta: CampaignMetadata = {}
    if (existing.message_template) {
      try {
        meta = JSON.parse(existing.message_template)
      } catch {
        // ignore
      }
    }

    if (updates.sent_count !== undefined) meta.sent_count = updates.sent_count
    if (updates.delivered_count !== undefined) meta.delivered_count = updates.delivered_count
    if (updates.failed_count !== undefined) meta.failed_count = updates.failed_count

    const dbPayload: Record<string, unknown> = {
      message_template: JSON.stringify(meta),
      updated_at: new Date().toISOString(),
    }

    if (updates.status) dbPayload.status = updates.status
    if (updates.started_at) dbPayload.started_at = updates.started_at
    if (updates.completed_at) dbPayload.completed_at = updates.completed_at

    const { error } = await supabase.from('campaigns').update(dbPayload).eq('id', id)
    if (error) return { success: false, error: error.message }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Query eligible leads for a campaign segment
 * Strictly excludes opted_out = true and is_eligible = false
 */
export async function getCampaignEligibleLeads(filters: {
  category?: string | null
  status?: string | null
  selectedLeadIds?: string[]
  limit?: number
}): Promise<{ leads: Lead[]; count: number; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('opted_out', false)
      .eq('is_eligible', true)
      .order('created_at', { ascending: false })

    if (filters.selectedLeadIds && filters.selectedLeadIds.length > 0) {
      query = query.in('id', filters.selectedLeadIds)
    } else {
      if (filters.category && filters.category !== 'ALL' && filters.category.trim() !== '') {
        query = query.ilike('category', `%${filters.category.trim()}%`)
      }

      if (filters.status && filters.status !== 'ALL' && filters.status.trim() !== '') {
        query = query.eq('status', filters.status.trim())
      }
    }

    if (filters.limit && filters.limit > 0) {
      query = query.limit(filters.limit)
    }

    const { data, count, error } = await query

    if (error) return { leads: [], count: 0, error: error.message }
    return { leads: (data as Lead[]) || [], count: count || 0, error: null }
  } catch (err) {
    return { leads: [], count: 0, error: (err as Error).message }
  }
}
