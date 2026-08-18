import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Lead, AIScoreResult } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'ALL'
    const category = searchParams.get('category') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = getSupabaseAdmin()
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    if (category && category !== '') {
      query = query.ilike('category', `%${category}%`)
    }

    if (search && search.trim() !== '') {
      const s = search.trim()
      query = query.or(`name.ilike.%${s}%,phone.ilike.%${s}%,business.ilike.%${s}%,category.ilike.%${s}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[Leads API] Supabase error:', error)
      return NextResponse.json({ leads: [], count: 0, error: error.message }, { status: 500 })
    }

    const leads = (data as Lead[]) ?? []

    // Attach latest AI score for each lead
    if (leads.length > 0) {
      const leadIds = leads.map((l) => l.id)
      const { data: scores } = await getSupabaseAdmin()
        .from('ai_scores')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })

      if (scores && scores.length > 0) {
        const scoreMap = new Map<string, AIScoreResult>()
        for (const s of scores) {
          if (!scoreMap.has(s.lead_id)) {
            scoreMap.set(s.lead_id, {
              id: s.id,
              lead_id: s.lead_id,
              score: s.score,
              classification: s.classification,
              reason: s.reasoning || '',
              recommended_action: s.intent || '',
              suggested_pitch: s.requirement || '',
              confidence: s.confidence,
              created_at: s.created_at,
            })
          }
        }
        leads.forEach((l) => {
          l.ai_score = scoreMap.get(l.id) || null
        })
      }
    }

    return NextResponse.json({ leads, count: count ?? 0, error: null })
  } catch (err) {
    console.error('[Leads API] Unexpected error:', err)
    return NextResponse.json({ leads: [], count: 0, error: (err as Error).message }, { status: 500 })
  }
}
