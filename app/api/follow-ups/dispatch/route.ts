import { NextRequest, NextResponse } from 'next/server'
import { dispatchDueFollowUps } from '@/services/follow-ups.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const maxBatch = typeof body.maxBatch === 'number' ? body.maxBatch : 3

    const result = await dispatchDueFollowUps({ maxBatch })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
