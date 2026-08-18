import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/services/whatsapp.service'
import { isAuthorizedApiRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  if (!(await isAuthorizedApiRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      leadId?: string
      destinationPhone?: string
      messageText?: string
    }

    if (!body.leadId || !body.destinationPhone || !body.messageText) {
      return NextResponse.json(
        { error: 'Missing required parameters: leadId, destinationPhone, messageText' },
        { status: 400 }
      )
    }

    const result = await sendWhatsAppMessage({
      leadId: body.leadId,
      destinationPhone: body.destinationPhone,
      messageText: body.messageText,
    })

    if (!result.success) {
      return NextResponse.json({ success: false, result, error: result.error }, { status: 403 })
    }

    return NextResponse.json({ success: true, result, error: null })
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
