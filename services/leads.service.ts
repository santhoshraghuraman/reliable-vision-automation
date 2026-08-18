/**
 * Leads service — Supabase operations for the leads table
 * Uses secure Next.js server-side API routes (/api/leads, /api/stats, /api/leads/import, /api/leads/[id]/score)
 */

import {
  Lead,
  LeadFilters,
  LeadUpdateInput,
  AuditLog,
  AIScoreResult,
  DashboardStats,
  ImportPreviewData,
  ImportResult,
} from '@/lib/types'
import { normalizePhone } from '@/lib/phone-utils'

const PAGE_SIZE = 50

/**
 * Fetch leads with optional filters, search, and pagination
 */
export async function getLeads(filters: LeadFilters = {}): Promise<{
  leads: Lead[]
  count: number
  error: string | null
}> {
  try {
    const {
      search = '',
      status = 'ALL',
      category = '',
      page = 1,
      pageSize = PAGE_SIZE,
    } = filters

    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status && status !== 'ALL') params.set('status', status)
    if (category) params.set('category', category)
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))

    const res = await fetch(`/api/leads?${params.toString()}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      return { leads: [], count: 0, error: errJson.error || `HTTP error ${res.status}` }
    }

    const data = await res.json()
    return {
      leads: data.leads ?? [],
      count: data.count ?? 0,
      error: data.error ?? null,
    }
  } catch (err) {
    console.error('[getLeads] Fetch error:', err)
    return { leads: [], count: 0, error: (err as Error).message }
  }
}

/**
 * Fetch a single lead by ID
 */
export async function getLeadById(id: string): Promise<{ lead: Lead | null; error: string | null }> {
  try {
    const res = await fetch(`/api/leads/${id}`, { cache: 'no-store' })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      return { lead: null, error: errJson.error || `Lead not found (HTTP ${res.status})` }
    }
    const data = await res.json()
    return { lead: data.lead ?? null, error: data.error ?? null }
  } catch (err) {
    return { lead: null, error: (err as Error).message }
  }
}

/**
 * Update lead fields
 */
export async function updateLead(
  id: string,
  updates: LeadUpdateInput
): Promise<{ lead: Lead | null; error: string | null }> {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    const data = await res.json()
    if (!res.ok) {
      return { lead: null, error: data.error || `Failed to update lead (HTTP ${res.status})` }
    }

    return { lead: data.lead ?? null, error: null }
  } catch (err) {
    return { lead: null, error: (err as Error).message }
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'DELETE',
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error || `Failed to delete lead (HTTP ${res.status})` }
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Trigger AI Lead Qualification Analysis for a single lead
 */
export async function scoreLead(id: string): Promise<{
  ai_score: AIScoreResult | null
  lead?: Lead
  error: string | null
}> {
  try {
    const res = await fetch(`/api/leads/${id}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()
    if (!res.ok) {
      return { ai_score: null, error: data.error || `Failed to score lead (HTTP ${res.status})` }
    }

    return { ai_score: data.ai_score ?? null, lead: data.lead, error: null }
  } catch (err) {
    return { ai_score: null, error: (err as Error).message }
  }
}

/**
 * Fetch existing AI score for a lead
 */
export async function getLeadScore(id: string): Promise<{
  ai_score: AIScoreResult | null
  error: string | null
}> {
  try {
    const res = await fetch(`/api/leads/${id}/score`, { cache: 'no-store' })
    if (!res.ok) {
      return { ai_score: null, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    return { ai_score: data.ai_score ?? null, error: null }
  } catch (err) {
    return { ai_score: null, error: (err as Error).message }
  }
}

/**
 * Run Batch AI Lead Qualification
 */
export async function bulkScoreLeads(
  limit = 50,
  force = false
): Promise<{
  total: number
  scored: number
  skipped: number
  failed: number
  error: string | null
}> {
  try {
    const res = await fetch('/api/leads/score-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit, force }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { total: 0, scored: 0, skipped: 0, failed: 0, error: data.error || `HTTP ${res.status}` }
    }

    return {
      total: data.total ?? 0,
      scored: data.scored ?? 0,
      skipped: data.skipped ?? 0,
      failed: data.failed ?? 0,
      error: null,
    }
  } catch (err) {
    return { total: 0, scored: 0, skipped: 0, failed: 0, error: (err as Error).message }
  }
}

/**
 * Fetch lead activity timeline / notes from audit_logs
 */
export async function getLeadActivity(leadId: string): Promise<{
  activity: AuditLog[]
  error: string | null
}> {
  try {
    const res = await fetch(`/api/leads/${leadId}/activity`, { cache: 'no-store' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { activity: [], error: data.error || `HTTP error ${res.status}` }
    }
    const data = await res.json()
    return { activity: data.activity ?? [], error: null }
  } catch (err) {
    return { activity: [], error: (err as Error).message }
  }
}

/**
 * Add a note to a lead's activity history
 */
export async function addLeadNote(
  leadId: string,
  note: string
): Promise<{ activity: AuditLog | null; error: string | null }> {
  try {
    const res = await fetch(`/api/leads/${leadId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { activity: null, error: data.error || `Failed to add note (HTTP ${res.status})` }
    }

    return { activity: data.activity ?? null, error: null }
  } catch (err) {
    return { activity: null, error: (err as Error).message }
  }
}

/**
 * Fetch dashboard statistics from Supabase
 */
export async function getDashboardStats(): Promise<{ stats: DashboardStats; error: string | null }> {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' })
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}))
      return {
        stats: {
          totalLeads: 0,
          hotLeads: 0,
          warmLeads: 0,
          coldLeads: 0,
          contactedLeads: 0,
          interestedLeads: 0,
          notInterestedLeads: 0,
          convertedLeads: 0,
          activeConversations: 0,
          pendingFollowUps: 0,
        },
        error: errJson.error || `HTTP error ${res.status}`,
      }
    }
    const data = await res.json()
    return {
      stats: data.stats ?? {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        contactedLeads: 0,
        interestedLeads: 0,
        notInterestedLeads: 0,
        convertedLeads: 0,
        activeConversations: 0,
        pendingFollowUps: 0,
      },
      error: data.error ?? null,
    }
  } catch (err) {
    return {
      stats: {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        contactedLeads: 0,
        interestedLeads: 0,
        notInterestedLeads: 0,
        convertedLeads: 0,
        activeConversations: 0,
        pendingFollowUps: 0,
      },
      error: (err as Error).message,
    }
  }
}

/**
 * Get unique categories for filter dropdown
 */
export async function getCategories(): Promise<string[]> {
  try {
    const res = await fetch('/api/leads/categories', { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.categories ?? []
  } catch {
    return []
  }
}

/**
 * Import leads via the secure server-side API route
 */
export async function importLeads(preview: ImportPreviewData): Promise<ImportResult> {
  const validRows = preview.valid.map((row) => ({
    name: row.name.trim(),
    phone: normalizePhone(row.phone),
    business: row.business?.trim() || null,
    category: row.category?.trim() || null,
    requirement: row.requirement?.trim() || null,
    status: 'COLD' as const,
    source: 'excel' as const,
    is_eligible: true,
    opted_out: false,
  }))

  const response = await fetch('/api/leads/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads: validRows }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  return response.json() as Promise<ImportResult>
}
