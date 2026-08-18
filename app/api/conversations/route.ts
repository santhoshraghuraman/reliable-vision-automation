import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Conversation, Lead, Message } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'ALL'
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('conversations')
      .select('*, leads(*)')
      .order('updated_at', { ascending: false })

    if (status && status !== 'ALL') {
      query = query.eq('status', status)
    }

    const { data: convData, error: convErr } = await query

    if (convErr) {
      return NextResponse.json({ conversations: [], error: convErr.message }, { status: 500 })
    }

    const conversations = (convData || []).map((row) => {
      const lead = row.leads as Lead | null
      return {
        id: row.id,
        lead_id: row.lead_id,
        status: row.status as 'ACTIVE' | 'WAITING' | 'CLOSED',
        channel: row.channel as 'whatsapp',
        last_message_at: row.last_message_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
        lead: lead || undefined,
      } as Conversation
    })

    // Fetch latest message for each conversation
    if (conversations.length > 0) {
      const convIds = conversations.map((c) => c.id)
      const { data: msgsData } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })

      if (msgsData) {
        const msgMap = new Map<string, Message[]>()
        for (const m of msgsData) {
          const arr = msgMap.get(m.conversation_id) || []
          arr.push(m as Message)
          msgMap.set(m.conversation_id, arr)
        }

        for (const c of conversations) {
          const convMsgs = msgMap.get(c.id) || []
          c.messages = convMsgs
        }
      }
    }

    // Filter by search term if provided
    let filtered = conversations
    if (search.trim()) {
      const s = search.toLowerCase()
      filtered = conversations.filter((c) => {
        const name = (c.lead?.name || '').toLowerCase()
        const business = (c.lead?.business || '').toLowerCase()
        const phone = (c.lead?.phone || '').toLowerCase()
        const lastMsg = (c.messages?.[0]?.message_text || '').toLowerCase()
        return name.includes(s) || business.includes(s) || phone.includes(s) || lastMsg.includes(s)
      })
    }

    return NextResponse.json({ conversations: filtered, count: filtered.length, error: null })
  } catch (err) {
    return NextResponse.json({ conversations: [], error: (err as Error).message }, { status: 500 })
  }
}
