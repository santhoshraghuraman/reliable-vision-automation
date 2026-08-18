/**
 * Conversations service — stub for future WhatsApp/n8n integration
 */

import { getSupabaseClient } from '@/lib/supabase'
import { Conversation, Message } from '@/lib/types'

export async function getConversations(leadId?: string): Promise<{
  conversations: Conversation[]
  error: string | null
}> {
  let query = getSupabaseClient()
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })

  if (leadId) {
    query = query.eq('lead_id', leadId)
  }

  const { data, error } = await query
  if (error) return { conversations: [], error: error.message }
  return { conversations: (data as Conversation[]) ?? [], error: null }
}

export async function getMessages(conversationId: string): Promise<{
  messages: Message[]
  error: string | null
}> {
  const { data, error } = await getSupabaseClient()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return { messages: [], error: error.message }
  return { messages: (data as Message[]) ?? [], error: null }
}

// TODO: Future integration points
// - sendMessage() → trigger n8n/WhatsApp Cloud API
// - handleInboundWebhook() → process Meta webhook events
// - updateConversationStatus() → after human takeover
