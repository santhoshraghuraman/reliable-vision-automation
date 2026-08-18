import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
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
    const supabase = getSupabaseAdmin()

    // 1. Check if campaign exists and is in a state that can be approved
    const { data: campaign, error: getErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (getErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot approve campaign in status: ${campaign.status}. Must be draft.` },
        { status: 400 }
      )
    }

    // 2. Mark as active (Approved)
    const { error: updateErr } = await supabase
      .from('campaigns')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) {
      throw updateErr
    }

    return NextResponse.json({ success: true, status: 'active', error: null })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
