import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { scoreLeadWithAI } from '@/services/ai-scoring.service'
import { Lead } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      limit?: number
      force?: boolean
    }
    const limit = Math.min(Math.max(body.limit || 50, 1), 500)
    const force = body.force ?? false
    const supabase = getSupabaseAdmin()

    // 1. Fetch leads
    const { data: leadsData, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (fetchErr || !leadsData) {
      return NextResponse.json({ error: fetchErr?.message || 'Failed to fetch leads' }, { status: 500 })
    }

    const allLeads = leadsData as Lead[]

    // 2. Identify already scored leads if not forced
    let leadsToScore = allLeads
    let skipped = 0

    if (!force) {
      const { data: existingScores } = await supabase
        .from('ai_scores')
        .select('lead_id')

      const scoredLeadIds = new Set((existingScores || []).map((s) => s.lead_id))
      leadsToScore = allLeads.filter((lead) => !scoredLeadIds.has(lead.id))
      skipped = allLeads.length - leadsToScore.length
    }

    let scored = 0
    let failed = 0
    const batchSize = 10

    for (let i = 0; i < leadsToScore.length; i += batchSize) {
      const chunk = leadsToScore.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        chunk.map(async (lead) => {
          const scoringOutput = await scoreLeadWithAI(lead)

          // Insert into ai_scores
          await supabase.from('ai_scores').insert({
            lead_id: lead.id,
            score: scoringOutput.score,
            classification: scoringOutput.classification,
            confidence: scoringOutput.confidence || 0.9,
            reasoning: scoringOutput.reason,
            intent: scoringOutput.recommended_action,
            requirement: scoringOutput.suggested_pitch,
          })

          // Update lead status if COLD
          if (lead.status === 'COLD' && (scoringOutput.classification === 'HOT' || scoringOutput.classification === 'WARM')) {
            await supabase
              .from('leads')
              .update({
                status: scoringOutput.classification,
                updated_at: new Date().toISOString(),
              })
              .eq('id', lead.id)
          }

          // Audit log
          await supabase.from('audit_logs').insert({
            lead_id: lead.id,
            action: 'AI_SCORED',
            details: {
              score: scoringOutput.score,
              classification: scoringOutput.classification,
              reason: scoringOutput.reason,
              recommended_action: scoringOutput.recommended_action,
              suggested_pitch: scoringOutput.suggested_pitch,
            },
            actor: 'gemini-ai',
          })

          return true
        })
      )

      for (const res of results) {
        if (res.status === 'fulfilled') {
          scored++
        } else {
          console.error('[score-all] Item failure:', res.reason)
          failed++
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: allLeads.length,
      scored,
      skipped,
      failed,
      error: null,
    })
  } catch (err) {
    console.error('[score-all API] Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
