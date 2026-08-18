import { NextRequest, NextResponse } from 'next/server'
import { getFollowUps, scheduleFollowUp } from '@/services/follow-ups.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ALL'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    const { followUps, totalCount, dueCount, error } = await getFollowUps({
      status,
      page,
      pageSize,
    })

    if (error) {
      return NextResponse.json({ followUps: [], totalCount: 0, dueCount: 0, error }, { status: 500 })
    }

    return NextResponse.json({ followUps, totalCount, dueCount, error: null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const { leadId, conversationId, attemptCount, delayHours, messageText } = body

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const { followUp, error } = await scheduleFollowUp({
      leadId,
      conversationId,
      attemptCount: typeof attemptCount === 'number' ? attemptCount : 1,
      delayHours: typeof delayHours === 'number' ? delayHours : 24,
      messageText,
    })

    if (error || !followUp) {
      return NextResponse.json({ error: error || 'Failed to schedule follow-up' }, { status: 400 })
    }

    return NextResponse.json({ followUp, success: true, error: null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
