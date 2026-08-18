import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('leads')
      .select('category')
      .not('category', 'is', null)
      .neq('category', '')

    if (error || !data) {
      return NextResponse.json({ categories: [] })
    }

    const unique = [...new Set(data.map((r) => r.category as string).filter(Boolean))].sort()
    return NextResponse.json({ categories: unique })
  } catch {
    return NextResponse.json({ categories: [] })
  }
}
