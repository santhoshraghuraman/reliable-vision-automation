/**
 * WhatsApp Cloud API & Automation Service
 * Operating in strict TEST MODE to ensure safety.
 * Handles WhatsApp message generation, outbound test dispatching,
 * inbound webhook processing, and conversation state sync.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Lead, AIScoreResult, WhatsAppSendResult, Conversation, Message } from '@/lib/types'
import { normalizePhone } from '@/lib/phone-utils'
import { analyzeConversationWithAI } from './conversation-ai.service'

const DEFAULT_TEST_PHONE = '+919597482995'

/**
 * Get current automation & test mode configuration
 */
export function getAutomationConfig() {
  const isTestMode = process.env.TEST_MODE !== 'false'
  const testPhone = normalizePhone(process.env.WHATSAPP_TEST_PHONE_NUMBER || DEFAULT_TEST_PHONE)
  const hasWhatsAppCreds = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
  )
  const hasN8n = Boolean(process.env.N8N_WEBHOOK_URL)
  const hasGemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)

  return {
    isTestMode,
    testPhone,
    hasWhatsAppCreds,
    hasN8n,
    hasGemini,
  }
}

/**
 * Generate a personalized WhatsApp sales pitch from lead metadata and AI scoring
 */
export async function generateWhatsAppPitch(
  lead: Lead,
  aiScore?: AIScoreResult | null
): Promise<string> {
  const businessName = lead.business || lead.name
  const category = lead.category || 'business'
  const pitch = aiScore?.suggested_pitch || lead.requirement

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (geminiApiKey) {
    try {
      const prompt = `
Generate a friendly, concise, and highly professional WhatsApp sales outreach message for a B2B web agency.
Business Name: ${businessName}
Category/Industry: ${category}
AI Qualification Score: ${aiScore?.score || 75}/100 (${aiScore?.classification || 'HOT'})
Context / Need: ${pitch || 'Needs a modern website to capture local clients and build credibility.'}

RULES FOR WHATSAPP OUTREACH:
- Keep it under 250 characters.
- Use 1 or 2 professional emojis max.
- Be respectful, direct, and conversational.
- End with a low-friction question (e.g., "Would you be open to seeing a 2-minute mockup?").
- Return ONLY the exact text of the message, no extra markdown formatting.
`
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`
      
      let attempt = 0
      const maxRetries = 3
      while (attempt < maxRetries) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          })

          if (response.ok) {
            const data = await response.json()
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text
            if (text && text.trim()) {
              return text.trim()
            }
          }
          
          if (response.status === 429 || response.status >= 500) {
            throw new Error(`Gemini rate limit or server error: ${response.status}`)
          }
          break; // If 400 or other client error, don't retry
        } catch (err) {
          attempt++
          if (attempt >= maxRetries) {
            console.warn(`[generateWhatsAppPitch] Gemini API failed after ${maxRetries} attempts:`, err)
            break
          }
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
        }
      }
    } catch (err) {
      console.warn('[generateWhatsAppPitch] General error in Gemini generation:', err)
    }
  }

  // High-converting default heuristic template
  return (
    `Hello ${businessName} team 👋\n\n` +
    `I came across your profile while reviewing leading ${category} businesses in your area. ` +
    `We help ${category} companies acquire more direct customers through high-performance websites and automated WhatsApp enquiry systems.\n\n` +
    `Would you be open to taking a quick look at a custom mockup we prepared for ${businessName}?`
  )
}

/**
 * Send a WhatsApp message with strict server-side TEST MODE enforcement
 */
export async function sendWhatsAppMessage(params: {
  leadId: string
  destinationPhone: string
  messageText: string
}): Promise<WhatsAppSendResult> {
  const { leadId, destinationPhone, messageText } = params
  const config = getAutomationConfig()
  const normalizedDestination = normalizePhone(destinationPhone)
  const supabase = getSupabaseAdmin()

  // 1. SAFETY ENFORCEMENT: If in Test Mode, destination MUST match configured test phone
  if (config.isTestMode && normalizedDestination !== config.testPhone) {
    return {
      success: false,
      isTestMode: true,
      destinationPhone: normalizedDestination,
      deliveryStatus: 'blocked_test_mode',
      error: `TEST MODE ACTIVE: Messaging to real CRM leads is disabled. Outbound messages can only be sent to the configured test number (${config.testPhone}). Attempted destination: ${normalizedDestination}`,
    }
  }

  // 2. Fetch or create active conversation
  let conversationId: string | undefined
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', leadId)
    .eq('channel', 'whatsapp')
    .maybeSingle()

  if (existingConv?.id) {
    conversationId = existingConv.id
    await supabase
      .from('conversations')
      .update({
        status: 'ACTIVE',
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  } else {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        lead_id: leadId,
        status: 'ACTIVE',
        channel: 'whatsapp',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single()

    conversationId = newConv?.id
  }

  if (!conversationId) {
    return {
      success: false,
      isTestMode: config.isTestMode,
      destinationPhone: normalizedDestination,
      deliveryStatus: 'failed',
      error: 'Could not create or find active conversation record',
    }
  }

  // 3. Check Customer Service Window (24h)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentInbound } = await supabase
    .from('messages')
    .select('created_at')
    .eq('lead_id', leadId)
    .eq('direction', 'INBOUND')
    .gte('created_at', twentyFourHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isWindowOpen = !!recentInbound

  // 4. Dispatch message via Meta API if credentials exist, otherwise Mock Simulated Dispatch
  let providerMessageId: string | null = null
  let deliveryStatus = 'ACCEPTED'
  let isSimulated = false
  let metaErrorDetail: string | null = null
  let sendSuccess = true

  if (config.hasWhatsAppCreds) {
    try {
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
      const token = process.env.WHATSAPP_ACCESS_TOKEN
      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`

      let customerName = 'Customer'
      if (config.isTestMode) {
        try {
          const { data: lead } = await supabase
            .from('leads')
            .select('name')
            .eq('id', leadId)
            .single()
          if (lead?.name) {
            customerName = lead.name
          }
        } catch (e) {
          console.warn('[sendWhatsAppMessage] Could not fetch lead name for template, using fallback', e)
        }
      }
      const sanitizedMessageText = messageText
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/ {5,}/g, ' ')
        .trim();

      const isTemplate = config.isTestMode || !isWindowOpen;
      const payload = isTemplate
        ? {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedDestination.replace('+', '').replace(/\D/g, ''),
            type: 'template',
            template: {
              name: 'reliable_vision_outreach_v3',
              language: {
                code: 'en',
              },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', parameter_name: 'customer_name', text: customerName },
                    { type: 'text', parameter_name: 'personalized_message', text: sanitizedMessageText }
                  ]
                }
              ]
            },
          }
        : {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedDestination.replace('+', '').replace(/\D/g, ''),
            type: 'text',
            text: { preview_url: false, body: messageText },
          };

      console.log(`[sendWhatsAppMessage] Sending ${isTemplate ? 'template (reliable_vision_outreach_v3)' : 'text'} to ${normalizedDestination}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const json = await res.json()
        providerMessageId = json.messages?.[0]?.id || null
        deliveryStatus = 'ACCEPTED'
        isSimulated = false
        sendSuccess = true
        console.log(`[sendWhatsAppMessage] Meta API accepted request. HTTP 200 OK. WAMID: ${providerMessageId}`);
      } else {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: { message?: string; error_data?: { details?: string }; type?: string; code?: number }
        }
        metaErrorDetail = errJson.error?.message || errJson.error?.error_data?.details || `Meta API HTTP error ${res.status}`
        deliveryStatus = 'FAILED'
        isSimulated = false
        sendSuccess = false
        console.warn('[sendWhatsAppMessage] Meta API rejected message:', errJson)
      }
    } catch (apiErr) {
      metaErrorDetail = (apiErr as Error).message
      deliveryStatus = 'FAILED'
      isSimulated = false
      sendSuccess = false
      console.warn('[sendWhatsAppMessage] Meta API network exception:', apiErr)
    }
  } else {
    // Simulated sandbox mode only when no credentials exist
    providerMessageId = `mock_wa_${Date.now()}`
    deliveryStatus = 'ACCEPTED'
    isSimulated = true
    sendSuccess = true
  }

  // 4. Save to public.messages
  const { data: savedMsg } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      lead_id: leadId,
      direction: 'OUTBOUND',
      sender_type: 'AI',
      message_text: messageText,
      provider: 'whatsapp',
      provider_message_id: providerMessageId,
      delivery_status: deliveryStatus,
    })
    .select()
    .single()

  // 5. Update lead last_contacted_at if message was sent or attempted
  await supabase
    .from('leads')
    .update({
      last_contacted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  // 6. Log to public.audit_logs
  await supabase.from('audit_logs').insert({
    lead_id: leadId,
    action: config.isTestMode ? 'WHATSAPP_TEST_SENT' : 'WHATSAPP_MESSAGE_SENT',
    details: {
      destination: normalizedDestination,
      message_text: messageText,
      conversation_id: conversationId,
      provider_message_id: providerMessageId,
      is_test_mode: config.isTestMode,
      is_simulated: isSimulated,
      meta_error: metaErrorDetail,
      delivery_status: deliveryStatus,
    },
    actor: 'whatsapp-automation',
  })

  return {
    success: sendSuccess,
    messageId: savedMsg?.id || providerMessageId || 'failed',
    conversationId,
    deliveryStatus,
    isTestMode: config.isTestMode,
    destinationPhone: normalizedDestination,
    error: metaErrorDetail,
  }
}

/**
 * Process inbound WhatsApp message webhook (Meta webhook or Simulation)
 */
export async function processInboundWhatsAppMessage(params: {
  senderPhone: string
  messageText: string
  waMessageId?: string
  timestamp?: string
  contextWaId?: string
  leadId?: string
  rawPayload?: Record<string, unknown>
}): Promise<{
  success: boolean
  lead: Lead | null
  conversation: Conversation | null
  message: Message | null
  error: string | null
}> {
  const { senderPhone, messageText, waMessageId, contextWaId, leadId: explicitLeadId, rawPayload } = params
  const config = getAutomationConfig()
  const supabase = getSupabaseAdmin()
  const normalizedPhone = normalizePhone(senderPhone)
  const last10Digits = normalizedPhone.slice(-10)

  // 0. Idempotency guard — skip if this Meta message ID was already processed
  if (waMessageId) {
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('provider_message_id', waMessageId)
      .maybeSingle()

    if (existingMsg?.id) {
      console.log(`[processInboundWhatsAppMessage] Duplicate skipped: ${waMessageId}`)
      return { success: true, lead: null, conversation: null, message: null, error: null }
    }
  }

  // 1. Record webhook event in public.webhook_events
  await supabase.from('webhook_events').insert({
    event_type: 'whatsapp_inbound_message',
    payload: rawPayload || {
      sender: normalizedPhone,
      message: messageText,
      wa_id: waMessageId,
      context_wa_id: contextWaId,
      received_at: new Date().toISOString(),
    },
    processed: true,
  })

  // 2. Resolve target lead
  let lead: Lead | undefined

  // If explicit leadId is provided (e.g. simulation or test harness)
  if (explicitLeadId) {
    const { data: expLead } = await supabase.from('leads').select('*').eq('id', explicitLeadId).maybeSingle()
    if (expLead) lead = expLead as Lead
  }

  // TEST_MODE RESOLUTION: When inbound message arrives from a configured test phone number
  const isTestPhoneSender =
    config.isTestMode &&
    (normalizedPhone === config.testPhone ||
      normalizedPhone.includes(config.testPhone.replace(/\D/g, '').slice(-10)) ||
      normalizedPhone.includes('9597482991') ||
      normalizedPhone.includes('9597482995'))

  if (!lead && isTestPhoneSender) {
    // Strategy A: Context match (WAMID of replied message)
    if (contextWaId) {
      const { data: repliedMsg } = await supabase
        .from('messages')
        .select('lead_id')
        .eq('provider_message_id', contextWaId)
        .maybeSingle()

      if (repliedMsg?.lead_id) {
        const { data: matchedLead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', repliedMsg.lead_id)
          .maybeSingle()

        if (matchedLead) lead = matchedLead as Lead
      }
    }

    // Strategy B: Find most recent OUTBOUND message to a real CRM lead in TEST_MODE
    if (!lead) {
      const { data: recentOutbound } = await supabase
        .from('messages')
        .select('lead_id, created_at')
        .eq('direction', 'OUTBOUND')
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentOutbound && recentOutbound.length > 0) {
        for (const outMsg of recentOutbound) {
          const { data: candidateLead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', outMsg.lead_id)
            .maybeSingle()

          // Pick the real lead that was contacted
          if (candidateLead && !candidateLead.name.startsWith('Inbound WhatsApp')) {
            lead = candidateLead as Lead
            break
          }
        }
      }
    }

    // Strategy C: Find most recent active lead with a follow-up in the pipeline
    if (!lead) {
      const { data: recentFollowUp } = await supabase
        .from('followups')
        .select('lead_id')
        .in('status', ['PENDING', 'SENT'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentFollowUp?.lead_id) {
        const { data: fLead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', recentFollowUp.lead_id)
          .maybeSingle()

        if (fLead) lead = fLead as Lead
      }
    }
  }

  // Strategy D: Standard phone number lookup (Production or non-test sender)
  if (!lead) {
    const { data: matchedLeads } = await supabase
      .from('leads')
      .select('*')
      .or(`phone.eq.${normalizedPhone},phone.ilike.%${last10Digits}%`)
      .limit(1)

    lead = matchedLeads?.[0] as Lead | undefined
  }

  // If no lead exists at all, create a new inbound lead record
  if (!lead) {
    const { data: newLead } = await supabase
      .from('leads')
      .insert({
        name: `Inbound WhatsApp (${normalizedPhone})`,
        phone: normalizedPhone,
        business: 'Inbound Inquiry',
        category: 'Inbound Customer',
        status: 'WARM',
        source: 'whatsapp',
        requirement: `Inbound message: "${messageText}"`,
        is_eligible: true,
        opted_out: false,
        last_replied_at: new Date().toISOString(),
      })
      .select()
      .single()

    lead = newLead as Lead
  } else {
    // Check for explicit opt-out keywords
    const optOutKeywords = ['stop', 'unsubscribe', 'not interested', 'cancel', 'remove', 'opt out', 'opt-out']
    const cleanMsg = messageText.toLowerCase().trim()
    const isOptOut = optOutKeywords.some((k) => cleanMsg === k || cleanMsg.startsWith(k))

    const leadUpdates: Record<string, unknown> = {
      last_replied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isOptOut) {
      leadUpdates.opted_out = true
      leadUpdates.status = 'NOT_INTERESTED'
    } else if (lead.status === 'COLD' || lead.status === 'CONTACTED') {
      leadUpdates.status = 'WARM'
    }

    const { data: updated } = await supabase
      .from('leads')
      .update(leadUpdates)
      .eq('id', lead.id)
      .select()
      .single()

    if (updated) lead = updated as Lead
  }

  if (!lead) {
    return { success: false, lead: null, conversation: null, message: null, error: 'Failed to find or create lead' }
  }

  // CANCEL ALL PENDING FOLLOW-UPS FOR THIS LEAD
  const { data: cancelledFollowUps } = await supabase
    .from('followups')
    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
    .eq('lead_id', lead.id)
    .eq('status', 'PENDING')
    .select('id')

  if (cancelledFollowUps && cancelledFollowUps.length > 0) {
    await supabase.from('audit_logs').insert({
      lead_id: lead.id,
      action: 'FOLLOW_UP_CANCELLED',
      actor: 'whatsapp-inbound-reply',
      details: {
        reason: 'customer_replied',
        is_test_mode: config.isTestMode,
        test_sender: normalizedPhone,
        cancelled_ids: cancelledFollowUps.map((c) => c.id),
        inbound_snippet: messageText.slice(0, 100),
      },
    })
  }

  // 3. Find or create conversation
  let conv: Conversation | null = null
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('*')
    .eq('lead_id', lead.id)
    .eq('channel', 'whatsapp')
    .maybeSingle()

  if (existingConv) {
    const { data: updatedConv } = await supabase
      .from('conversations')
      .update({
        status: 'ACTIVE',
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingConv.id)
      .select()
      .single()

    conv = updatedConv as Conversation
  } else {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        lead_id: lead.id,
        status: 'ACTIVE',
        channel: 'whatsapp',
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single()

    conv = newConv as Conversation
  }

  if (!conv) {
    return { success: false, lead, conversation: null, message: null, error: 'Failed to create conversation' }
  }

  // 4. Save inbound message
  const { data: savedMsg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conv.id,
      lead_id: lead.id,
      direction: 'INBOUND',
      sender_type: 'CUSTOMER',
      message_text: messageText,
      provider: 'whatsapp',
      provider_message_id: waMessageId || `inbound_wa_${Date.now()}`,
      delivery_status: 'DELIVERED',
    })
    .select()
    .single()

  if (msgErr) {
    console.error('[processInboundWhatsAppMessage] Failed to save message:', msgErr)
  }

  // 5. Log audit entry
  await supabase.from('audit_logs').insert({
    lead_id: lead.id,
    action: 'WHATSAPP_INBOUND_RECEIVED',
    details: {
      phone: normalizedPhone,
      message_text: messageText,
      conversation_id: conv.id,
      provider_message_id: waMessageId,
    },
    actor: 'whatsapp-webhook',
  })

  // 6. Trigger AI Conversation Intelligence Analysis
  try {
    const aiAnalysis = await analyzeConversationWithAI({
      conversationId: conv.id,
      leadId: lead.id,
      latestMessageText: messageText,
    })
    conv.ai_analysis = aiAnalysis
  } catch (aiErr) {
    console.warn('[processInboundWhatsAppMessage] AI Analysis background error:', aiErr)
  }

  return {
    success: true,
    lead,
    conversation: conv,
    message: savedMsg as Message,
    error: null,
  }
}

/**
 * Process WhatsApp delivery receipt / status update from Meta webhook
 */
export async function processWhatsAppStatusUpdate(params: {
  providerMessageId: string
  status: string
  recipientPhone?: string
  timestamp?: string
  errors?: unknown[]
  rawPayload?: Record<string, unknown>
}): Promise<{
  success: boolean
  messageId: string | null
  status: string
  error: string | null
}> {
  const { providerMessageId, status, rawPayload } = params
  const supabase = getSupabaseAdmin()

  const STATUS_PRIORITY: Record<string, number> = {
    'QUEUED': 0,
    'PROCESSING': 1,
    'ACCEPTED': 2,
    'PENDING': 2,
    'SENT': 3,
    'DELIVERED': 4,
    'READ': 5,
    'FAILED': 6,
  }

  const normalizedStatus = (status || '').toUpperCase()
  const incomingStatus = Object.keys(STATUS_PRIORITY).includes(normalizedStatus) ? normalizedStatus : 'SENT'

  // 1. Record webhook status event
  await supabase.from('webhook_events').insert({
    event_type: `whatsapp_status_${status.toLowerCase()}`,
    payload: rawPayload || params,
    processed: true,
  })

  // 1.5 Fetch current message status
  const { data: currentMsg } = await supabase
    .from('messages')
    .select('delivery_status, id')
    .eq('provider_message_id', providerMessageId)
    .maybeSingle()

  const currentStatus = (currentMsg?.delivery_status || 'QUEUED').toUpperCase().split(':')[0]
  let dbStatus = incomingStatus

  // Enforce Monotonic Progression: Do not downgrade status
  if ((STATUS_PRIORITY[incomingStatus] ?? 0) < (STATUS_PRIORITY[currentStatus] ?? 0)) {
    dbStatus = currentMsg?.delivery_status || currentStatus
  }

  // Append error details if FAILED
  if (incomingStatus === 'FAILED' && params.errors && params.errors.length > 0) {
    try {
      const errorDetail = (params.errors[0] as any)?.title || JSON.stringify(params.errors)
      dbStatus = `FAILED: ${errorDetail}`
    } catch {
      dbStatus = 'FAILED'
    }
  }

  // 2. Update message record in public.messages
  const { data: updatedMsg, error: updateErr } = await supabase
    .from('messages')
    .update({ delivery_status: dbStatus })
    .eq('provider_message_id', providerMessageId)
    .select('id, lead_id, conversation_id')
    .maybeSingle()

  if (updateErr) {
    console.error('[processWhatsAppStatusUpdate] Error updating message status:', updateErr)
  }

  // 3. Log audit entry if message found
  if (updatedMsg?.lead_id) {
    await supabase.from('audit_logs').insert({
      lead_id: updatedMsg.lead_id,
      action: `WHATSAPP_STATUS_${dbStatus}`,
      details: {
        provider_message_id: providerMessageId,
        status: dbStatus,
        conversation_id: updatedMsg.conversation_id,
      },
      actor: 'whatsapp-status-webhook',
    })
  }

  return {
    success: !updateErr,
    messageId: updatedMsg?.id || null,
    status: dbStatus,
    error: updateErr?.message || null,
  }
}
