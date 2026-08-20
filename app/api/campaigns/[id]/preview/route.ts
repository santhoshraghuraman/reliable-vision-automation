import { NextRequest, NextResponse } from 'next/server'
import { getCampaignById, getCampaignEligibleLeads } from '@/services/campaigns.service'
import { generateWhatsAppPitch, getAutomationConfig } from '@/services/whatsapp.service'
import { CampaignLeadPreview, Lead } from '@/lib/types'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

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
    const config = getAutomationConfig()

    let category = body.category as string | undefined
    let status = body.status as string | undefined
    let selectedLeadIds = body.selectedLeadIds as string[] | undefined
    const requestedLimit = typeof body.limit === 'number' ? body.limit : (config.isTestMode ? 10 : 50)
    const limit = config.isTestMode
      ? Math.min(Math.max(1, requestedLimit), 10)
      : Math.min(Math.max(1, requestedLimit), 50)

    if (id !== 'new') {
      const { campaign } = await getCampaignById(id)
      if (campaign) {
        category = category || campaign.filter_category || undefined
        status = status || campaign.filter_status || undefined
        selectedLeadIds = selectedLeadIds || campaign.selected_lead_ids || undefined
      }
    }

    const { leads, count, error } = await getCampaignEligibleLeads({
      category: category || null,
      status: status || null,
      selectedLeadIds,
      limit,
    })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Generate personalized pitch for each lead in parallel (with concurrency limit)
    const previews: CampaignLeadPreview[] = await Promise.all(
      leads.map(async (lead: Lead) => {
        let pitch = ''
        try {
          pitch = await generateWhatsAppPitch(lead, lead.ai_score || null)
        } catch {
          pitch = `Hello ${lead.business || lead.name} 👋 We noticed your profile and prepared a custom web mockup. Would you like to see it?`
        }

        const isOptedOut = lead.opted_out === true
        return {
          lead,
          generatedMessage: pitch,
          status: isOptedOut ? 'blocked_opted_out' : 'pending',
          error: isOptedOut ? 'Lead has opted out of automated outreach' : null,
        }
      })
    )

    return NextResponse.json({
      previews,
      totalEligibleCount: count,
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
