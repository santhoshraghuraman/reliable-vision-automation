/**
 * POST /api/campaigns/activate
 *
 * Activates a campaign: queues eligible leads for WhatsApp outreach.
 *
 * When a campaign is set to 'active':
 *   1. Fetch all leads with campaign_status = 'pending'
 *   2. Insert campaign_leads records (junction table)
 *   3. Return queue size
 *
 * Sending is done separately via /api/whatsapp/send (manual or automated).
 *
 * Request Body:
 * { campaign_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const { campaign_id } = await request.json();

    if (!campaign_id) {
      return NextResponse.json({ error: 'Missing campaign_id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify campaign exists and is active
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('id', campaign_id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign must be set to active first' },
        { status: 400 }
      );
    }

    // 1. Fetch pending leads not already in this campaign
    const { data: existingLeadIds } = await supabase
      .from('campaign_leads')
      .select('lead_id')
      .eq('campaign_id', campaign_id);

    const alreadyQueued = new Set((existingLeadIds || []).map((cl: any) => cl.lead_id));

    // Fetch up to 1000 pending leads to evaluate eligibility
    const { data: pendingLeads, error: leadsErr } = await supabase
      .from('leads')
      .select('id, website_status, status')
      .eq('campaign_status', 'pending')
      .limit(1000);

    if (leadsErr) {
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    const unprocessedLeads = (pendingLeads || []).filter((l: any) => !alreadyQueued.has(l.id));

    if (unprocessedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        queued: 0,
        message: 'No new pending leads to queue for this campaign',
      });
    }

    const eligibleLeads: any[] = [];
    const leadsToUpdate: any[] = []; // Leads that need status/eligibility updates in the DB

    // 2. Evaluate Eligibility
    for (const lead of unprocessedLeads) {
      // Opted out checks
      if (lead.status === 'lost') {
        leadsToUpdate.push({
          id: lead.id,
          campaign_status: 'failed',
          eligible_for_outreach: false,
          eligibility_reason: 'Lead has opted out or is marked as lost.'
        });
        continue;
      }

      // Website status checks
      if (lead.website_status === 'HAS_WEBSITE') {
        leadsToUpdate.push({
          id: lead.id,
          campaign_status: 'failed', // Mark failed so it's not repeatedly processed as pending
          eligible_for_outreach: false,
          eligibility_reason: 'Business already has a website. Excluded from no-website outreach.'
        });
      } else if (lead.website_status === 'UNKNOWN') {
        leadsToUpdate.push({
          id: lead.id,
          campaign_status: 'failed',
          eligible_for_outreach: false,
          eligibility_reason: 'Website status is unknown. Cannot automatically send without verification.'
        });
      } else if (lead.website_status === 'ERROR') {
        leadsToUpdate.push({
          id: lead.id,
          campaign_status: 'failed',
          eligible_for_outreach: false,
          eligibility_reason: 'Website verification resulted in an error. Manual check required.'
        });
      } else if (lead.website_status === 'NO_WEBSITE') {
        // Eligible!
        leadsToUpdate.push({
          id: lead.id,
          eligible_for_outreach: true,
          eligibility_reason: 'No website detected. Eligible for outreach.'
          // We leave campaign_status as 'pending' for the queue processor to handle
        });
        
        // Respect WhatsApp limit per activation block (max 500 queued)
        if (eligibleLeads.length < 500) {
          eligibleLeads.push(lead);
        }
      }
    }

    // 3. Update Leads Table in batches
    if (leadsToUpdate.length > 0) {
      for (let i = 0; i < leadsToUpdate.length; i += 100) {
        const chunk = leadsToUpdate.slice(i, i + 100);
        await supabase.from('leads').upsert(chunk);
      }
    }

    if (eligibleLeads.length === 0) {
      return NextResponse.json({
        success: true,
        queued: 0,
        message: 'Leads processed, but 0 were eligible for outreach.',
      });
    }

    // 4. Bulk insert into campaign_leads junction table for queueing
    const campaignLeadRows = eligibleLeads.map((l: any) => ({
      campaign_id,
      lead_id: l.id,
      status: 'pending',
    }));

    const { error: insertErr } = await supabase
      .from('campaign_leads')
      .insert(campaignLeadRows);

    if (insertErr) {
      return NextResponse.json(
        { error: 'Failed to queue eligible leads', details: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign_id,
      campaign_name: campaign.name,
      queued: eligibleLeads.length,
      processed: unprocessedLeads.length,
      message: `${eligibleLeads.length} leads queued for campaign "${campaign.name}" out of ${unprocessedLeads.length} evaluated.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
