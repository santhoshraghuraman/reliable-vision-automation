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
    const body = await request.json().catch(() => ({}))
    const reason = body.reason || 'manual_user_cancel'
    const supabase = getSupabaseAdmin()

    const { data: followUp, error: fetchErr } = await supabase
      .from('followups')
      .select('id, lead_id, status')
      .eq('id', id)
      .single()

    if (fetchErr || !followUp) {
      return NextResponse.json({ error: 'Follow-up record not found' }, { status: 404 })
    }

    if (followUp.status !== 'PENDING') {
      return NextResponse.json({ error: `Cannot cancel follow-up with status ${followUp.status}` }, { status: 400 })
    }

    const { error: updateErr } = await supabase
      .from('followups')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      lead_id: followUp.lead_id,
      action: 'FOLLOW_UP_CANCELLED',
      actor: 'user',
      details: {
        follow_up_id: id,
        reason,
      },
    })

    return NextResponse.json({ success: true, error: null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
