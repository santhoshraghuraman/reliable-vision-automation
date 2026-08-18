import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateWhatsAppPitch } from '@/services/whatsapp.service'
import { Lead, AIScoreResult } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { leadId?: string }
    const supabase = getSupabaseAdmin()

    let lead: Lead | null = null
    let aiScore: AIScoreResult | null = null

    if (body.leadId) {
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', body.leadId)
        .single()
      lead = leadData as Lead | null

      if (lead) {
        const { data: scoreData } = await supabase
          .from('ai_scores')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (scoreData) {
          aiScore = {
            id: scoreData.id,
            lead_id: scoreData.lead_id,
            score: scoreData.score,
            classification: scoreData.classification,
            reason: scoreData.reasoning || '',
            recommended_action: scoreData.intent || '',
            suggested_pitch: scoreData.requirement || '',
            confidence: scoreData.confidence,
            created_at: scoreData.created_at,
          }
        }
      }
    } else {
      // Pick first qualified lead as default sample
      const { data: sampleLeads } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      lead = (sampleLeads?.[0] as Lead) || null
    }

    if (!lead) {
      return NextResponse.json({ error: 'No lead found for test message generation' }, { status: 404 })
    }

    const messageText = await generateWhatsAppPitch(lead, aiScore)

    return NextResponse.json({
      success: true,
      messageText,
      lead,
      aiScore,
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
