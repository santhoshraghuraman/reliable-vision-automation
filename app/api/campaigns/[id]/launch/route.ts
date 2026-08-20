import { NextRequest, NextResponse } from 'next/server'
import { getCampaignById, getCampaignEligibleLeads, updateCampaignProgress } from '@/services/campaigns.service'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedApiRequest } from '@/lib/api-auth'
import { getAutomationConfig } from '@/services/whatsapp.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const requestedMaxLeads = typeof body.maxLeads === 'number' ? body.maxLeads : 100
    const config = getAutomationConfig()
    const maxLeads = config.isTestMode 
      ? Math.min(Math.max(1, requestedMaxLeads), 10)
      : Math.min(Math.max(1, requestedMaxLeads), 1000) // Allow up to 1000 for queuing

    const { campaign, error: getErr } = await getCampaignById(id)
    if (getErr || !campaign) {
      return NextResponse.json({ error: getErr || 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'active') {
      return NextResponse.json({ error: `Campaign must be 'active' (approved) to launch, currently: ${campaign.status}` }, { status: 400 })
    }

    // 1. Mark campaign RUNNING
    const startedAt = new Date().toISOString()
    await updateCampaignProgress(id, {
      status: 'RUNNING',
      started_at: startedAt,
    })

    // 2. Fetch eligible leads
    const { leads } = await getCampaignEligibleLeads({
      category: campaign.filter_category,
      status: campaign.filter_status,
      selectedLeadIds: campaign.selected_lead_ids,
      limit: maxLeads,
    })

    const supabase = getSupabaseAdmin()
    
    // 3. Queue leads into campaign_leads
    const queueData = leads.map(lead => ({
      campaign_id: id,
      lead_id: lead.id,
      status: 'pending'
    }))

    if (queueData.length > 0) {
      const { error: insertErr } = await supabase
        .from('campaign_leads')
        .upsert(queueData, { onConflict: 'campaign_id,lead_id', ignoreDuplicates: true })

      if (insertErr) {
         console.error('[launch] Queue insert error:', insertErr)
         return NextResponse.json({ error: 'Failed to queue campaign leads' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      campaignId: id,
      queuedCount: leads.length,
      status: 'running',
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
