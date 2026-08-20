import { NextRequest, NextResponse } from 'next/server'
import { getCampaigns, createCampaign } from '@/services/campaigns.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { campaigns, error } = await getCampaigns()
    if (error) {
      return NextResponse.json({ campaigns: [], error }, { status: 500 })
    }
    return NextResponse.json({ campaigns, error: null })
  } catch (err) {
    return NextResponse.json({ campaigns: [], error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const { name, description, filterCategory, filterStatus, selectedLeadIds, ratePerMinute, targetCount, template } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    }

    const { campaign, error } = await createCampaign({
      name: name.trim(),
      description,
      filterCategory,
      filterStatus,
      selectedLeadIds: Array.isArray(selectedLeadIds) ? selectedLeadIds : undefined,
      ratePerMinute: typeof ratePerMinute === 'number' ? ratePerMinute : 3,
      targetCount: typeof targetCount === 'number' ? targetCount : 0,
      template,
    })

    if (error || !campaign) {
      return NextResponse.json({ error: error || 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign, success: true, error: null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
