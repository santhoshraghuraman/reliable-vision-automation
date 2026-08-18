import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { scoreLeadWithAI } from '@/services/ai-scoring.service'
import { Lead, AIScoreResult } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('ai_scores')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ai_score: null, error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ ai_score: null, error: null })
    }

    const aiScore: AIScoreResult = {
      id: data.id,
      lead_id: data.lead_id,
      score: data.score,
      classification: data.classification,
      reason: data.reasoning || '',
      recommended_action: data.intent || '',
      suggested_pitch: data.requirement || '',
      confidence: data.confidence ?? undefined,
      created_at: data.created_at,
    }

    return NextResponse.json({ ai_score: aiScore, error: null })
  } catch (err) {
    return NextResponse.json({ ai_score: null, error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // 1. Fetch Lead
    const { data: leadData, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (leadErr || !leadData) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = leadData as Lead

    // 2. Perform AI Analysis
    const scoringOutput = await scoreLeadWithAI(lead)

    // 3. Save to public.ai_scores
    const { data: scoreRecord, error: scoreErr } = await supabase
      .from('ai_scores')
      .insert({
        lead_id: id,
        score: scoringOutput.score,
        classification: scoringOutput.classification,
        confidence: scoringOutput.confidence || 0.9,
        reasoning: scoringOutput.reason,
        intent: scoringOutput.recommended_action,
        requirement: scoringOutput.suggested_pitch,
      })
      .select()
      .single()

    if (scoreErr) {
      console.error('[Score API] Failed to insert ai_scores:', scoreErr)
    }

    // 4. Update Lead Status if applicable (e.g. COLD -> HOT or COLD -> WARM)
    let updatedLead = lead
    if (lead.status === 'COLD' && (scoringOutput.classification === 'HOT' || scoringOutput.classification === 'WARM')) {
      const { data: leadUpdated } = await supabase
        .from('leads')
        .update({
          status: scoringOutput.classification,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (leadUpdated) {
        updatedLead = leadUpdated as Lead
      }
    }

    // 5. Log Audit Event
    await supabase.from('audit_logs').insert({
      lead_id: id,
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

    const result: AIScoreResult = {
      id: scoreRecord?.id,
      lead_id: id,
      score: scoringOutput.score,
      classification: scoringOutput.classification,
      reason: scoringOutput.reason,
      recommended_action: scoringOutput.recommended_action,
      suggested_pitch: scoringOutput.suggested_pitch,
      confidence: scoringOutput.confidence,
      created_at: scoreRecord?.created_at || new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      ai_score: result,
      lead: updatedLead,
      error: null,
    })
  } catch (err) {
    console.error('[Score API] Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
