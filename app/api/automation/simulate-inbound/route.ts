import { NextRequest, NextResponse } from 'next/server'
import { processInboundWhatsAppMessage } from '@/services/whatsapp.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      senderPhone?: string
      messageText?: string
    }

    if (!body.senderPhone || !body.messageText) {
      return NextResponse.json(
        { error: 'Missing senderPhone or messageText' },
        { status: 400 }
      )
    }

    const result = await processInboundWhatsAppMessage({
      senderPhone: body.senderPhone,
      messageText: body.messageText,
      waMessageId: `simulated_inbound_${Date.now()}`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      lead: result.lead,
      conversation: result.conversation,
      message: result.message,
      error: null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
