/**
 * POST /api/cron/followups
 *
 * Condition-aware follow-up automation engine.
 * Triggered by Vercel Cron (see vercel.json) every 30 minutes.
 * Can also be called manually for testing.
 *
 * Architecture:
 *   Scheduled trigger
 *   → Query due follow-ups
 *   → Check eligibility conditions for each
 *   → If eligible: send via WhatsApp
 *   → Update followup status
 *   → Schedule next follow-up if needed
 *
 * Eligibility conditions (ALL must pass):
 *   1. followup.status = 'scheduled' AND scheduled_at <= NOW()
 *   2. lead.campaign_status != 'replied' (customer hasn't already replied)
 *   3. conversation.status != 'handoff' (no human takeover active)
 *   4. conversation.human_takeover != true
 *   5. followup not cancelled
 *
 * Security: Requires CRON_SECRET header or query param
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  // --- Security: Validate cron secret ---
  const authHeader = request.headers.get('authorization');
  const cronSecretHeader = authHeader?.replace('Bearer ', '');
  const { searchParams } = new URL(request.url);
  const cronSecretParam = searchParams.get('secret');

  const expectedSecret = process.env.CRON_SECRET;

  if (
    expectedSecret &&
    cronSecretHeader !== expectedSecret &&
    cronSecretParam !== expectedSecret
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  try {
    // --- Fetch all due scheduled follow-ups ---
    const { data: dueFollowups, error: fetchErr } = await supabase
      .from('followups')
      .select(
        `
        id,
        lead_id,
        followup_number,
        notes,
        scheduled_at,
        leads (
          id,
          name,
          phone,
          business,
          status,
          campaign_status
        ),
        conversations:conversations!lead_id (
          id,
          status,
          human_takeover
        )
      `
      )
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .limit(50); // Process max 50 per run to stay within timeout

    if (fetchErr) {
      console.error('[Cron] Failed to fetch due followups:', fetchErr);
      return NextResponse.json(
        { error: 'DB query failed', details: fetchErr.message },
        { status: 500 }
      );
    }

    const results: Array<{
      followup_id: string;
      lead_id: string;
      lead_name: string;
      result: 'sent' | 'skipped' | 'failed';
      reason: string;
    }> = [];

    for (const followup of dueFollowups || []) {
      const lead = (followup as any).leads;
      const conversation = (followup as any).conversations?.[0];

      // --- Eligibility checks ---

      // 1. Lead must exist
      if (!lead) {
        await supabase
          .from('followups')
          .update({ status: 'failed' })
          .eq('id', followup.id);
        results.push({
          followup_id: followup.id,
          lead_id: followup.lead_id,
          lead_name: 'Unknown',
          result: 'skipped',
          reason: 'Lead not found',
        });
        continue;
      }

      // 2. Skip if customer already replied to this conversation
      if (lead.campaign_status === 'replied' || lead.campaign_status === 'completed') {
        await supabase
          .from('followups')
          .update({ status: 'cancelled' })
          .eq('id', followup.id);
        results.push({
          followup_id: followup.id,
          lead_id: followup.lead_id,
          lead_name: lead.name,
          result: 'skipped',
          reason: 'Customer already replied — follow-up cancelled',
        });
        continue;
      }

      // 3. Skip if human has taken over the conversation
      if (conversation?.human_takeover === true || conversation?.status === 'handoff') {
        results.push({
          followup_id: followup.id,
          lead_id: followup.lead_id,
          lead_name: lead.name,
          result: 'skipped',
          reason: 'Human takeover active — AI follow-up suppressed',
        });
        continue;
      }

      // 4. Skip cold leads after first follow-up (don't spam disinterested leads)
      if (lead.status === 'cold' && (followup.followup_number || 1) > 1) {
        await supabase
          .from('followups')
          .update({ status: 'cancelled' })
          .eq('id', followup.id);
        results.push({
          followup_id: followup.id,
          lead_id: followup.lead_id,
          lead_name: lead.name,
          result: 'skipped',
          reason: 'Lead is cold — only 1 follow-up allowed for cold leads',
        });
        continue;
      }

      // --- Build personalized follow-up message ---
      const followupNumber = followup.followup_number || 1;
      const businessName = 'Reliable Vision | Web Studio';
      const portfolioUrl =
        process.env.PORTFOLIO_URL || 'https://santhosh-portfolio-gamma.vercel.app/';

      let followupMessage = '';

      if (followup.notes && followup.notes.trim()) {
        // Use custom message if set
        followupMessage = followup.notes
          .replace('{{name}}', lead.name || 'there')
          .replace('{{business}}', lead.business || 'your business');
      } else if (followupNumber === 1) {
        followupMessage = `Hi ${lead.name || 'there'}, following up on our website proposal for ${lead.business || 'your business'}. Have you had a chance to review our portfolio? ${portfolioUrl}`;
      } else if (followupNumber === 2) {
        followupMessage = `Hi ${lead.name || 'there'}! Just a friendly check-in from ${businessName}. We'd love to help ${lead.business || 'your business'} get online. Any questions?`;
      } else {
        followupMessage = `Hi ${lead.name || 'there'}, last message from ${businessName}. If you'd like a free website consultation, let us know — happy to help anytime!`;
      }

      // --- Send via WhatsApp ---
      let convId = conversation?.id;
      let sendSuccess = false;
      let sendError = '';

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      try {
        const sendResponse = await fetch(`${appUrl}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: lead.phone,
            message: followupMessage,
            lead_id: lead.id,
            conversation_id: convId || null,
            is_ai_generated: true,
          }),
        });

        const sendResult = await sendResponse.json();
        sendSuccess = sendResult.success === true;
        convId = sendResult.conversation_id || convId;

        if (!sendSuccess) {
          sendError = sendResult.error || 'WhatsApp send failed';
        }
      } catch (sendErr: any) {
        sendError = sendErr.message || 'Network error calling /api/whatsapp/send';
      }

      // --- Update followup status ---
      if (sendSuccess) {
        await supabase
          .from('followups')
          .update({
            status: 'sent',
            sent_at: now,
          })
          .eq('id', followup.id);

        results.push({
          followup_id: followup.id,
          lead_id: followup.lead_id,
          lead_name: lead.name,
          result: 'sent',
          reason: `Follow-up #${followupNumber} sent successfully`,
        });
      } else {
        await supabase
          .from('followups')
          .update({ status: 'failed' })
          .eq('id', followup.id);

        results.push({
          followup_id: followup.id,
          lead_id: followup.lead_id,
          lead_name: lead.name,
          result: 'failed',
          reason: sendError,
        });
      }
    }

    const sent = results.filter((r) => r.result === 'sent').length;
    const skipped = results.filter((r) => r.result === 'skipped').length;
    const failed = results.filter((r) => r.result === 'failed').length;

    console.log(
      `[Cron] Follow-up run complete: ${sent} sent, ${skipped} skipped, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      timestamp: now,
      processed: results.length,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (err: any) {
    console.error('[Cron] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also allow GET for easy manual triggering with secret param
export async function GET(request: NextRequest) {
  return POST(request);
}
