import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { timingSafeEqual } from 'crypto';

const getBaseUrl = (req: NextRequest) => {
  const host = req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
};

export async function POST(request: NextRequest) {
  try {
    // =========================================================================
    // AUTHENTICATION — Shared Secret
    // The caller must supply the correct secret in: x-queue-secret header.
    // The secret is stored in QUEUE_PROCESSOR_SECRET env var (never in source).
    // We use constant-time comparison to avoid timing attacks.
    // =========================================================================
    const expectedSecret = process.env.QUEUE_PROCESSOR_SECRET;
    const suppliedSecret = request.headers.get('x-queue-secret');

    if (!expectedSecret) {
      // Misconfiguration — fail closed, never allow unconfigured access
      console.error('[Queue Processor] QUEUE_PROCESSOR_SECRET is not configured. Refusing request.');
      return NextResponse.json({ error: 'Queue processor is not configured.' }, { status: 503 });
    }

    // Constant-time comparison to prevent timing side-channel.
    // timingSafeEqual REQUIRES equal-length buffers — the length check
    // must come first and must short-circuit (&&) before the call.
    // A different-length secret therefore returns false without crashing.
    const expectedBuf = Buffer.from(expectedSecret, 'utf8');
    const suppliedBuf = Buffer.from(suppliedSecret || '', 'utf8');
    const secretsMatch =
      expectedBuf.length === suppliedBuf.length &&
      timingSafeEqual(expectedBuf, suppliedBuf);

    if (!secretsMatch) {
      // Do NOT log the supplied value — it may be a real secret leaked accidentally
      console.warn('[Queue Processor] Unauthorized request — invalid or missing x-queue-secret.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reqBodyLimit = parseInt(body.limit) || 1;
    const targetCampaignLeadId = body.campaign_lead_id; // Targeted test mode param

    const isTestMode = process.env.TEST_MODE !== 'false';

    // SECURITY: Reject targeted ID in production mode
    if (!isTestMode && targetCampaignLeadId) {
      console.warn('[Queue Processor] Rejected targeted claim: target ID is only allowed in TEST_MODE.');
      return NextResponse.json({ error: 'Targeted claiming is forbidden in production mode.' }, { status: 403 });
    }

    // HARD LIMIT FOR TEST MODE — Cannot be overridden by the request body
    let limit = 1;
    if (isTestMode) {
      limit = 1;
    } else {
      const MAX_SAFE_LIMIT = 50;
      limit = Math.min(Math.max(reqBodyLimit, 1), MAX_SAFE_LIMIT);
    }

    const supabase = createServiceRoleClient();
    const baseUrl = getBaseUrl(request);

    // 0. Recover stale jobs (Node crashes)
    await supabase.rpc('recover_stale_campaign_leads', { p_timeout_minutes: 5 });

    // 1. Claim a job atomically
    let claimedJobs: any[] | null = null;
    let claimErr: any = null;

    if (isTestMode && targetCampaignLeadId) {
      // TARGETED CLAIM
      const { data, error } = await supabase.rpc('claim_targeted_campaign_lead', { p_target_id: targetCampaignLeadId });
      claimedJobs = data;
      claimErr = error;
    } else {
      // STANDARD CLAIM
      const { data, error } = await supabase.rpc('claim_campaign_lead', { p_limit: limit });
      claimedJobs = data;
      claimErr = error;
    }

    if (claimErr) {
      console.error('[Queue Processor] Error claiming job:', claimErr);
      return NextResponse.json({ success: false, error: 'Failed to claim job from queue', details: claimErr }, { status: 500 });
    }

    if (!claimedJobs || claimedJobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty, no campaigns running, or target ineligible.' });
    }

    const results = [];

    // 2. Process claimed jobs sequentially (to respect rate limits)
    for (const job of claimedJobs) {
      console.log(`[Queue Processor] Processing campaign_lead_id: ${job.id}`);
      
      let currentJobStatus = 'processing';
      let metaMessageId = null;
      let lastError = null;

      try {
        // Step A: AI Personalization (Skip if already completed)
        if (job.personalization_status !== 'completed' || !job.personalized_message) {
          console.log(`[Queue Processor] Triggering AI Personalization for ${job.id}`);
          const aiResponse = await fetch(`${baseUrl}/api/ai/personalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_lead_id: job.id }),
          });

          const aiData = await aiResponse.json();

          if (!aiResponse.ok || !aiData.success) {
            throw new Error(`AI Personalization failed: ${aiData.error || 'Unknown error'}`);
          }
          console.log(`[Queue Processor] AI Personalization successful for ${job.id}`);
        } else {
           console.log(`[Queue Processor] AI Personalization already completed for ${job.id}`);
        }

        // Step A.5: Verify Campaign Race Condition (Pause/Cancel Safety Check)
        // Check if campaign was paused/cancelled, or lead opted out, *after* we claimed the job
        const { data: rawFreshLeadCheck } = await supabase
          .from('campaign_leads')
          .select(`
            status,
            campaigns ( status ),
            leads ( status, opted_out, eligible_for_outreach )
          `)
          .eq('id', job.id)
          .single();
          
        const freshLeadCheck = rawFreshLeadCheck as any;

        if (!freshLeadCheck || 
            (Array.isArray(freshLeadCheck.campaigns) ? freshLeadCheck.campaigns[0]?.status : freshLeadCheck.campaigns?.status) !== 'running' || 
            freshLeadCheck.status !== 'processing' ||
            (Array.isArray(freshLeadCheck.leads) ? freshLeadCheck.leads[0]?.status : freshLeadCheck.leads?.status) === 'lost' ||
            (Array.isArray(freshLeadCheck.leads) ? freshLeadCheck.leads[0]?.opted_out : freshLeadCheck.leads?.opted_out) === true ||
            (Array.isArray(freshLeadCheck.leads) ? freshLeadCheck.leads[0]?.eligible_for_outreach : freshLeadCheck.leads?.eligible_for_outreach) !== true
        ) {
           console.log(`[Queue Processor] Race condition detected for ${job.id}. Halting send. Data:`, freshLeadCheck);
           const campStatus = Array.isArray(freshLeadCheck?.campaigns) ? freshLeadCheck?.campaigns[0]?.status : freshLeadCheck?.campaigns?.status;
           currentJobStatus = campStatus === 'cancelled' ? 'cancelled' : 'pending';
           throw new Error('Pre-send safety check failed (Campaign paused/cancelled, or lead became ineligible)');
        }

        // Step B: Send WhatsApp Message
        console.log(`[Queue Processor] Triggering WhatsApp Send for ${job.id}`);
        const waResponse = await fetch(`${baseUrl}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaign_lead_id: job.id }),
        });

        const waData = await waResponse.json();

        if (waResponse.ok && waData.success) {
          currentJobStatus = 'sent';
          metaMessageId = waData.wamid;
          console.log(`[Queue Processor] WhatsApp Send successful for ${job.id}. WAMID: ${metaMessageId}`);
        } else {
          // WhatsApp send failed
          const isTransient = waResponse.status >= 500 || waResponse.status === 429;
          throw new Error(`WhatsApp send failed (${waResponse.status}): ${waData.error || 'Unknown error'}. Transient: ${isTransient}`);
        }

      } catch (err: any) {
        console.error(`[Queue Processor] Job ${job.id} failed:`, err.message);
        lastError = err.message;
        
        // Determine if it's transient based on error string matching (simple heuristic)
        const isTransient = err.message.includes('Transient: true') || err.message.includes('Network failure');
        
        if (isTransient && job.attempts + 1 < job.max_attempts) {
           currentJobStatus = 'pending';
        } else {
           currentJobStatus = 'failed';
        }
      }

      // Step C: Finalize Job State
      const updatePayload: any = {
        status: currentJobStatus,
        attempts: job.attempts + 1,
        completed_at: currentJobStatus === 'sent' || currentJobStatus === 'failed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (lastError) updatePayload.last_error = lastError;
      if (metaMessageId) updatePayload.meta_message_id = metaMessageId;

      if (currentJobStatus === 'pending') {
        // Schedule retry in 15 minutes
        const nextRun = new Date();
        nextRun.setMinutes(nextRun.getMinutes() + 15);
        updatePayload.scheduled_at = nextRun.toISOString();
        console.log(`[Queue Processor] Job ${job.id} scheduled for retry at ${nextRun.toISOString()}`);
      }

      await supabase
        .from('campaign_leads')
        .update(updatePayload)
        .eq('id', job.id);
        
      results.push({
        id: job.id,
        status: currentJobStatus,
        error: lastError
      });
    }

    return NextResponse.json({
      success: true,
      processed: claimedJobs.length,
      results
    });

  } catch (err: any) {
    console.error('[Queue Processor] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
