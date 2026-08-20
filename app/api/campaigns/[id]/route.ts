import { NextRequest, NextResponse } from 'next/server'
import { getCampaignById } from '@/services/campaigns.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { campaign, error } = await getCampaignById(id)

    if (error || !campaign) {
      return NextResponse.json({ error: error || 'Campaign not found' }, { status: 404 })
    }

    // Fetch queue records for this campaign
    const { getSupabaseAdmin } = await import('@/lib/supabase-server')
    const supabase = getSupabaseAdmin()
    
    const { data: queue } = await supabase
      .from('campaign_leads')
      .select('*, lead:leads(name, phone, business, category, status)')
      .eq('campaign_id', id)
      .order('scheduled_at', { ascending: true })

    return NextResponse.json({ campaign, queue: queue || [], error: null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
