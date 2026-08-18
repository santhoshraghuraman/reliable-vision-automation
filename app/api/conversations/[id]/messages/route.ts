import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendWhatsAppMessage, getAutomationConfig } from '@/services/whatsapp.service'
import { Message, Lead } from '@/lib/types'
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

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ messages: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: (messages as Message[]) || [], error: null })
  } catch (err) {
    return NextResponse.json({ messages: [], error: (err as Error).message }, { status: 500 })
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
    const body = (await request.json().catch(() => ({}))) as {
      messageText?: string
      destinationPhone?: string
      overrideOptOut?: boolean
    }

    if (!body.messageText) {
      return NextResponse.json({ error: 'Missing messageText' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // 1. Fetch conversation to get lead_id
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*, leads(*)')
      .eq('id', id)
      .single()

    if (convErr || !conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const config = getAutomationConfig()
    const lead = conv.leads as Lead | null

    // Safety guard: Check if lead opted out or is NOT_INTERESTED
    if ((lead?.opted_out || lead?.status === 'NOT_INTERESTED') && !body.overrideOptOut) {
      return NextResponse.json(
        {
          error: 'This lead has opted out or indicated NOT_INTERESTED. Automated outreach is paused.',
          isOptedOut: true,
        },
        { status: 400 }
      )
    }

    const targetPhone = config.isTestMode
      ? config.testPhone
      : body.destinationPhone || lead?.phone || '+919597482995'

    // 2. Dispatch via sendWhatsAppMessage (strictly enforces TEST MODE)
    const sendResult = await sendWhatsAppMessage({
      leadId: conv.lead_id,
      destinationPhone: targetPhone,
      messageText: body.messageText,
    })

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error, result: sendResult }, { status: 403 })
    }

    // 3. Fetch latest messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      result: sendResult,
      messages: messages || [],
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
