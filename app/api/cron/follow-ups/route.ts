import { NextRequest, NextResponse } from 'next/server'
import { dispatchDueFollowUps } from '@/services/follow-ups.service'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET

    // If CRON_SECRET is configured, enforce authorization
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}` && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const result = await dispatchDueFollowUps({ maxBatch: 10 })

    if (result.error) {
      return NextResponse.json({ status: 'ERROR', error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (err) {
    return NextResponse.json({ status: 'ERROR', error: (err as Error).message }, { status: 500 })
  }
}
