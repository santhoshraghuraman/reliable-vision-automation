import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { AuditLog } from '@/lib/types'
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
      .from('audit_logs')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ activity: [], error: error.message }, { status: 500 })
    }

    return NextResponse.json({ activity: (data as AuditLog[]) ?? [], error: null })
  } catch (err) {
    return NextResponse.json({ activity: [], error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await params
    const { note } = (await request.json()) as { note: string }

    if (!note || note.trim() === '') {
      return NextResponse.json({ error: 'Note text cannot be empty' }, { status: 400 })
    }

    const { data, error } = await getSupabaseAdmin()
      .from('audit_logs')
      .insert({
        lead_id: id,
        action: 'NOTE_ADDED',
        details: { note: note.trim() },
        actor: 'user',
      })
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Failed to save note' }, { status: 500 })
    }

    return NextResponse.json({ activity: data as AuditLog, error: null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
