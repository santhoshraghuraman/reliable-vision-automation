import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { phones } = (await request.json()) as { phones: string[] }

    if (!Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ existingPhones: [] })
    }

    const existingPhones: string[] = []
    const batchSize = 100

    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize)
      const { data, error } = await getSupabaseAdmin()
        .from('leads')
        .select('phone')
        .in('phone', batch)

      if (error) {
        console.error('[Check Duplicates API] Supabase error:', error)
        continue
      }

      if (data) {
        data.forEach((lead) => existingPhones.push(lead.phone))
      }
    }

    return NextResponse.json({ existingPhones })
  } catch (err) {
    console.error('[Check Duplicates API] Unexpected error:', err)
    return NextResponse.json({ existingPhones: [] })
  }
}
