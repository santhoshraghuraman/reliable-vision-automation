import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { Lead, LeadUpdateInput } from '@/lib/types'
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
    const { data, error } = await getSupabaseAdmin()
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ lead: null, error: error?.message || 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead: data as Lead, error: null })
  } catch (err) {
    return NextResponse.json({ lead: null, error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const body = (await request.json()) as LeadUpdateInput
    const supabase = getSupabaseAdmin()

    // 1. Fetch current lead state for audit log comparison
    const { data: currentLead, error: fetchErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !currentLead) {
      return NextResponse.json({ lead: null, error: 'Lead not found' }, { status: 404 })
    }

    // 2. Perform update
    const updatePayload: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    const { data: updatedLead, error: updateErr } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr || !updatedLead) {
      return NextResponse.json({ lead: null, error: updateErr?.message || 'Update failed' }, { status: 500 })
    }

    // 3. Log audit event
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    for (const key of Object.keys(body) as (keyof LeadUpdateInput)[]) {
      if (body[key] !== undefined && body[key] !== currentLead[key]) {
        changes[key] = { from: currentLead[key], to: body[key] }
      }
    }

    const isStatusChange = body.status && body.status !== currentLead.status
    const action = isStatusChange ? 'STATUS_CHANGED' : 'LEAD_UPDATED'

    await supabase.from('audit_logs').insert({
      lead_id: id,
      action,
      details: { changes, previous_status: currentLead.status, new_status: body.status },
      actor: 'user',
    })

    return NextResponse.json({ lead: updatedLead as Lead, error: null })
  } catch (err) {
    return NextResponse.json({ lead: null, error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // 1. Fetch lead before deleting
    const { data: leadToDelete } = await supabase
      .from('leads')
      .select('id, name, phone, business')
      .eq('id', id)
      .single()

    // 2. Delete lead
    const { error: delErr } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (delErr) {
      return NextResponse.json({ success: false, error: delErr.message }, { status: 500 })
    }

    // 3. Log delete action
    await supabase.from('audit_logs').insert({
      lead_id: null,
      action: 'LEAD_DELETED',
      details: { deleted_lead: leadToDelete || { id } },
      actor: 'user',
    })

    return NextResponse.json({ success: true, error: null })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
