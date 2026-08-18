import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Conversation, Lead, Message } from '@/lib/types'
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

    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*, leads(*)')
      .eq('id', id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ conversation: null, error: convErr?.message || 'Conversation not found' }, { status: 404 })
    }

    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    const result: Conversation = {
      id: conv.id,
      lead_id: conv.lead_id,
      status: conv.status,
      channel: conv.channel,
      last_message_at: conv.last_message_at,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      lead: (conv.leads as Lead) || undefined,
      messages: (messages as Message[]) || [],
    }

    return NextResponse.json({ conversation: result, error: null })
  } catch (err) {
    return NextResponse.json({ conversation: null, error: (err as Error).message }, { status: 500 })
  }
}
