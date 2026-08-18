import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  analyzeConversationWithAI,
  getLatestConversationAnalysis,
} from '@/services/conversation-ai.service'

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

    // 1. Fetch conversation to get lead_id
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, lead_id')
      .eq('id', id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 2. Fetch latest analysis
    let analysis = await getLatestConversationAnalysis(conv.id, conv.lead_id)

    // If no analysis exists yet, generate initial analysis
    if (!analysis) {
      analysis = await analyzeConversationWithAI({
        conversationId: conv.id,
        leadId: conv.lead_id,
      })
    }

    return NextResponse.json({ analysis, error: null })
  } catch (err) {
    return NextResponse.json({ analysis: null, error: (err as Error).message }, { status: 500 })
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

    // 1. Fetch conversation to get lead_id
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, lead_id')
      .eq('id', id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // 2. Run fresh analysis
    const analysis = await analyzeConversationWithAI({
      conversationId: conv.id,
      leadId: conv.lead_id,
    })

    return NextResponse.json({ success: true, analysis, error: null })
  } catch (err) {
    return NextResponse.json({ success: false, analysis: null, error: (err as Error).message }, { status: 500 })
  }
}
