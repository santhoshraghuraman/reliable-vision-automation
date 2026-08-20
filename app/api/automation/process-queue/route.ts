import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendWhatsAppMessage, generateWhatsAppPitch, getAutomationConfig } from '@/services/whatsapp.service'
import { scheduleFollowUp } from '@/services/follow-ups.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'
import { Lead } from '@/lib/types'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const config = getAutomationConfig()

    // 0. Recover stale jobs (timeout > 5 mins)
    await supabase.rpc('recover_stale_campaign_leads', { p_timeout_minutes: 5 })

    // 1. Claim exactly ONE pending job atomically
    const { data: claimedRows, error: claimErr } = await supabase.rpc('claim_campaign_lead', { p_limit: 1 })

    if (claimErr) {
      console.error('[process-queue] Claim error:', claimErr)
      return NextResponse.json({ error: 'Failed to claim job', details: claimErr.message }, { status: 500 })
    }

    if (!claimedRows || claimedRows.length === 0) {
      // Check if there are any remaining running campaigns to mark completed
      const { data: runningCampaigns } = await supabase
        .from('campaigns')
        .select('id')
        .eq('status', 'RUNNING')

      if (runningCampaigns && runningCampaigns.length > 0) {
        for (const camp of runningCampaigns) {
          const { count: pendingCount } = await supabase
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', camp.id)
            .in('status', ['pending', 'processing'])

          if (pendingCount === 0) {
            await supabase.from('campaigns').update({
              status: 'COMPLETED',
              completed_at: new Date().toISOString()
            }).eq('id', camp.id)
          }
        }
      }

      return NextResponse.json({ success: true, message: 'Queue is empty' }, { status: 200 })
    }

    const job = claimedRows[0]

    // 2. Fetch full lead data
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', job.lead_id)
      .single()

    const lead = leadData as Lead | null

    if (!lead) {
      await supabase.from('campaign_leads').update({ status: 'failed', last_error: 'Lead not found' }).eq('id', job.id)
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
    }

    // 3. Opt-Out Check
    if (lead.opted_out || lead.status === 'NOT_INTERESTED') {
      await supabase.from('campaign_leads').update({ status: 'cancelled', last_error: 'Opted out' }).eq('id', job.id)
      return NextResponse.json({ success: true, result: 'Cancelled (Opt-Out)' }, { status: 200 })
    }

    // 4. Generate Message
    let messageText = ''
    try {
      messageText = await generateWhatsAppPitch(lead, lead.ai_score || null)
    } catch {
      messageText = `Hello ${lead.business || lead.name} 👋 We noticed your profile and prepared a custom web mockup. Would you like to see it?`
    }

    // 5. Dispatch
    const targetPhone = config.isTestMode ? config.testPhone : lead.phone
    const sendRes = await sendWhatsAppMessage({
      leadId: lead.id,
      destinationPhone: targetPhone,
      messageText,
    })

    if (sendRes.success) {
      // Success Update
      await supabase.from('campaign_leads').update({
        status: 'sent',
        completed_at: new Date().toISOString(),
        meta_message_id: sendRes.messageId
      }).eq('id', job.id)

      await supabase.from('leads').update({
        last_contacted_at: new Date().toISOString(),
        status: lead.status === 'COLD' ? 'CONTACTED' : lead.status,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)

      await scheduleFollowUp({
        leadId: lead.id,
        attemptCount: 1,
        delayHours: 24,
      }).catch((schedErr) => console.warn('[process-queue] follow-up scheduling skipped:', schedErr))

      await supabase.from('audit_logs').insert({
        lead_id: lead.id,
        action: 'CAMPAIGN_MESSAGE_SENT',
        actor: 'queue-processor',
        details: { campaign_id: job.campaign_id, destination: targetPhone, provider_message_id: sendRes.messageId },
      })

      // Increment campaign sent_count
      const { data: currentCamp } = await supabase.from('campaigns').select('sent_count').eq('id', job.campaign_id).single()
      if (currentCamp) {
        await supabase.from('campaigns').update({ sent_count: (currentCamp.sent_count || 0) + 1 }).eq('id', job.campaign_id)
      }

      return NextResponse.json({ success: true, status: 'SENT' }, { status: 200 })
    } else {
      // Failure Update
      const attemptCount = job.attempts + 1
      const isFatal = attemptCount >= job.max_attempts
      
      await supabase.from('campaign_leads').update({
        status: isFatal ? 'failed' : 'pending',
        attempts: attemptCount,
        last_error: sendRes.error
      }).eq('id', job.id)

      await supabase.from('audit_logs').insert({
        lead_id: lead.id,
        action: 'CAMPAIGN_MESSAGE_FAILED',
        actor: 'queue-processor',
        details: { campaign_id: job.campaign_id, destination: targetPhone, error: sendRes.error },
      })

      // Increment campaign failed_count if fatal
      if (isFatal) {
        const { data: currentCamp } = await supabase.from('campaigns').select('failed_count').eq('id', job.campaign_id).single()
        if (currentCamp) {
          await supabase.from('campaigns').update({ failed_count: (currentCamp.failed_count || 0) + 1 }).eq('id', job.campaign_id)
        }
      }

      return NextResponse.json({ success: false, status: 'FAILED', error: sendRes.error }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
