/**
 * Automated Follow-ups Service
 * Manages 24h & 48h automated WhatsApp follow-up scheduling,
 * eligibility checks, cancellation hooks, and rate-limited batch dispatching.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { FollowUp, Lead, FollowUpStatus } from '@/lib/types'
import { sendWhatsAppMessage, getAutomationConfig } from './whatsapp.service'

/**
 * Generate a friendly, non-intrusive AI follow-up pitch via Gemini
 */
export async function generateFollowUpPitch(lead: Lead, attemptCount: number = 1): Promise<string> {
  const businessName = lead.business || lead.name
  const category = lead.category || 'business'
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (geminiApiKey) {
    try {
      const prompt = attemptCount === 1
        ? `Generate a gentle, casual, and low-friction WhatsApp follow-up message (Follow-up #1) for a B2B web design agency.
Business Name: ${businessName}
Category: ${category}

RULES:
- Under 180 characters.
- Polite, brief, no aggressive sales jargon.
- Angle: Check if they had a chance to review the website mockup prepared for them.
- Return ONLY the plain text of the WhatsApp message.`
        : `Generate a polite closure/break-up WhatsApp follow-up message (Follow-up #2 - Final) for a B2B web design agency.
Business Name: ${businessName}
Category: ${category}

RULES:
- Under 180 characters.
- Respectful closure.
- Angle: "No worries if now isn't the right time! Should I keep your file on hold, or check back next quarter?"
- Return ONLY the plain text of the WhatsApp message.`

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`
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
    } catch (err) {
      console.warn('[generateFollowUpPitch] Gemini fallback:', err)
    }
  }

  // High-converting heuristic templates
  if (attemptCount === 1) {
    return (
      `Hi ${businessName} team 👋 Just wanted to check if you had a chance to look at the custom website mockup we prepared for you? Happy to answer any quick questions!`
    )
  }

  return (
    `Hi ${businessName} team, no worries if now isn't the right time for a new website. Should I close your file for now, or check back next quarter? Wishing you continued success! 🙌`
  )
}

/**
 * Fetch follow-ups list with lead metadata
 */
export async function getFollowUps(filters: {
  status?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ followUps: FollowUp[]; totalCount: number; dueCount: number; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()
    const { status = 'ALL', page = 1, pageSize = 50 } = filters

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('followups')
      .select('*, lead:leads(*)', { count: 'exact' })
      .order('scheduled_at', { ascending: true })
      .range(from, to)

    if (status && status !== 'ALL' && status !== 'DUE') {
      query = query.eq('status', status)
    } else if (status === 'DUE') {
      query = query.eq('status', 'PENDING').lte('scheduled_at', new Date().toISOString())
    }

    const { data, count, error } = await query
    if (error) return { followUps: [], totalCount: 0, dueCount: 0, error: error.message }

    // Also count total due right now
    const { count: dueCount } = await supabase
      .from('followups')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING')
      .lte('scheduled_at', new Date().toISOString())

    return {
      followUps: (data as FollowUp[]) || [],
      totalCount: count || 0,
      dueCount: dueCount || 0,
      error: null,
    }
  } catch (err) {
    return { followUps: [], totalCount: 0, dueCount: 0, error: (err as Error).message }
  }
}

/**
 * Schedule a new follow-up
 * Prevents duplicate PENDING follow-ups for the same lead.
 */
export async function scheduleFollowUp(params: {
  leadId: string
  conversationId?: string | null
  attemptCount?: number
  delayHours?: number
  messageText?: string
}): Promise<{ followUp: FollowUp | null; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()
    const { leadId, conversationId = null, attemptCount = 1, delayHours = 24, messageText } = params

    // 1. Verify lead eligibility
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single()
    if (!lead) return { followUp: null, error: 'Lead not found' }

    if (lead.opted_out || lead.status === 'NOT_INTERESTED' || lead.status === 'CONVERTED') {
      return { followUp: null, error: 'Lead is not eligible for automated follow-up' }
    }

    // If lead has already replied after last contact, do not schedule
    if (lead.last_replied_at && lead.last_contacted_at && new Date(lead.last_replied_at) > new Date(lead.last_contacted_at)) {
      return { followUp: null, error: 'Lead has already replied' }
    }

    // 2. Deduplication check: Cancel or check existing PENDING follow-up
    const { data: existing } = await supabase
      .from('followups')
      .select('id, attempt_count')
      .eq('lead_id', leadId)
      .eq('status', 'PENDING')
      .maybeSingle()

    if (existing) {
      // If already pending same or higher attempt, skip
      if (existing.attempt_count >= attemptCount) {
        return { followUp: null, error: 'Follow-up is already pending for this lead' }
      }
      // Cancel previous attempt
      await supabase.from('followups').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', existing.id)
    }

    // 3. Compute scheduled time
    const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()
    const pitch = messageText || (await generateFollowUpPitch(lead as Lead, attemptCount))

    const { data: created, error } = await supabase
      .from('followups')
      .insert({
        lead_id: leadId,
        conversation_id: conversationId,
        scheduled_at: scheduledAt,
        status: 'PENDING',
        message_text: pitch,
        attempt_count: attemptCount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error || !created) {
      return { followUp: null, error: error?.message || 'Failed to schedule follow-up' }
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      lead_id: leadId,
      action: 'FOLLOW_UP_SCHEDULED',
      actor: 'follow-up-engine',
      details: {
        follow_up_id: created.id,
        attempt_count: attemptCount,
        scheduled_at: scheduledAt,
        delay_hours: delayHours,
      },
    })

    return { followUp: created as FollowUp, error: null }
  } catch (err) {
    return { followUp: null, error: (err as Error).message }
  }
}

/**
 * Automatically cancel all PENDING follow-ups for a lead
 * Called on inbound reply, opt-out, or status change.
 */
export async function cancelPendingFollowUps(leadId: string, reason: string): Promise<{ cancelledCount: number; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin()

    const { data: pending } = await supabase
      .from('followups')
      .select('id')
      .eq('lead_id', leadId)
      .eq('status', 'PENDING')

    if (!pending || pending.length === 0) {
      return { cancelledCount: 0, error: null }
    }

    const ids = pending.map((f) => f.id)
    const { error } = await supabase
      .from('followups')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) return { cancelledCount: 0, error: error.message }

    // Audit log
    await supabase.from('audit_logs').insert({
      lead_id: leadId,
      action: 'FOLLOW_UP_CANCELLED',
      actor: 'follow-up-engine',
      details: {
        cancelled_ids: ids,
        reason,
      },
    })

    return { cancelledCount: ids.length, error: null }
  } catch (err) {
    return { cancelledCount: 0, error: (err as Error).message }
  }
}

/**
 * Process and dispatch all due follow-ups with dual-layer safety & rate limiting
 */
export async function dispatchDueFollowUps(options: {
  maxBatch?: number
  delayMs?: number
} = {}): Promise<{
  totalProcessed: number
  sentCount: number
  failedCount: number
  cancelledCount: number
  results: Array<{
    followUpId: string
    leadName: string
    destination: string
    status: 'SENT' | 'CANCELLED' | 'FAILED'
    attemptCount: number
    wamid?: string | null
    error?: string | null
  }>
  error: string | null
}> {
  try {
    const config = getAutomationConfig()
    const supabase = getSupabaseAdmin()
    const maxBatch = config.isTestMode
      ? Math.min(options.maxBatch || 3, 3)
      : Math.min(options.maxBatch || 20, 50)
    const delayMs = options.delayMs || 20000 // 3 messages / minute

    // 1. Fetch due PENDING follow-ups
    const { data: dueFollowUps, error } = await supabase
      .from('followups')
      .select('*, lead:leads(*)')
      .eq('status', 'PENDING')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(maxBatch)

    if (error) {
      return { totalProcessed: 0, sentCount: 0, failedCount: 0, cancelledCount: 0, results: [], error: error.message }
    }

    if (!dueFollowUps || dueFollowUps.length === 0) {
      return { totalProcessed: 0, sentCount: 0, failedCount: 0, cancelledCount: 0, results: [], error: null }
    }

    let sentCount = 0
    let failedCount = 0
    let cancelledCount = 0
    let dispatchedIndex = 0

    const results: Array<{
      followUpId: string
      leadName: string
      destination: string
      status: 'SENT' | 'CANCELLED' | 'FAILED'
      attemptCount: number
      wamid?: string | null
      error?: string | null
    }> = []

    for (const item of dueFollowUps) {
      const lead = item.lead as Lead | undefined

      // Hard check: If lead is missing, opted out, or not interested -> Cancel
      if (!lead || lead.opted_out || lead.status === 'NOT_INTERESTED' || lead.status === 'CONVERTED') {
        cancelledCount++
        await supabase.from('followups').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', item.id)
        results.push({
          followUpId: item.id,
          leadName: lead?.name || 'Unknown',
          destination: lead?.phone || '',
          status: 'CANCELLED',
          attemptCount: item.attempt_count,
          error: 'Lead opted out, converted, or inactive.',
        })
        continue
      }

      // Check if lead already replied after last outreach
      if (lead.last_replied_at && lead.last_contacted_at && new Date(lead.last_replied_at) > new Date(lead.last_contacted_at)) {
        cancelledCount++
        await supabase.from('followups').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', item.id)
        results.push({
          followUpId: item.id,
          leadName: lead.name,
          destination: lead.phone,
          status: 'CANCELLED',
          attemptCount: item.attempt_count,
          error: 'Customer already replied.',
        })
        continue
      }

      // Rate limit delay before subsequent sends
      if (dispatchedIndex > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      dispatchedIndex++

      // Pitch text
      const messageText = item.message_text || (await generateFollowUpPitch(lead, item.attempt_count))

      // Send via sendWhatsAppMessage (enforces TEST_MODE)
      const targetPhone = config.isTestMode ? config.testPhone : lead.phone
      const sendRes = await sendWhatsAppMessage({
        leadId: lead.id,
        destinationPhone: targetPhone,
        messageText,
      })

      if (sendRes.success) {
        sentCount++
        const sentAt = new Date().toISOString()

        // 1. Mark this follow-up as SENT
        await supabase
          .from('followups')
          .update({
            status: 'SENT',
            sent_at: sentAt,
            message_text: messageText,
            updated_at: sentAt,
          })
          .eq('id', item.id)

        // 2. Update lead last_contacted_at
        await supabase
          .from('leads')
          .update({
            last_contacted_at: sentAt,
            updated_at: sentAt,
          })
          .eq('id', lead.id)

        // 3. If Attempt 1, automatically schedule Follow-up #2 (+48 hours)
        if (item.attempt_count === 1) {
          const followUp2ScheduledAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
          const pitch2 = await generateFollowUpPitch(lead, 2)
          await supabase.from('followups').insert({
            lead_id: lead.id,
            conversation_id: item.conversation_id,
            scheduled_at: followUp2ScheduledAt,
            status: 'PENDING',
            message_text: pitch2,
            attempt_count: 2,
            created_at: sentAt,
            updated_at: sentAt,
          })
        }

        // 4. Audit Log
        await supabase.from('audit_logs').insert({
          lead_id: lead.id,
          action: 'FOLLOW_UP_DISPATCHED',
          actor: 'follow-up-engine',
          details: {
            follow_up_id: item.id,
            attempt_count: item.attempt_count,
            destination: targetPhone,
            is_test_mode: config.isTestMode,
            provider_message_id: sendRes.messageId,
            next_follow_up_scheduled: item.attempt_count === 1,
          },
        })

        results.push({
          followUpId: item.id,
          leadName: lead.name,
          destination: targetPhone,
          status: 'SENT',
          attemptCount: item.attempt_count,
          wamid: sendRes.messageId,
        })
      } else {
        failedCount++
        await supabase
          .from('followups')
          .update({
            status: 'FAILED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)

        await supabase.from('audit_logs').insert({
          lead_id: lead.id,
          action: 'FOLLOW_UP_FAILED',
          actor: 'follow-up-engine',
          details: {
            follow_up_id: item.id,
            attempt_count: item.attempt_count,
            destination: targetPhone,
            error: sendRes.error,
          },
        })

        results.push({
          followUpId: item.id,
          leadName: lead.name,
          destination: targetPhone,
          status: 'FAILED',
          attemptCount: item.attempt_count,
          error: sendRes.error,
        })
      }
    }

    return {
      totalProcessed: dueFollowUps.length,
      sentCount,
      failedCount,
      cancelledCount,
      results,
      error: null,
    }
  } catch (err) {
    return {
      totalProcessed: 0,
      sentCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      results: [],
      error: (err as Error).message,
    }
  }
}
