import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processInboundWhatsAppMessage, processWhatsAppStatusUpdate } from '@/services/whatsapp.service'

/**
 * Meta Webhook Verification (GET)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'reliable_vision_webhook_token_2026'

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Verification handshake successful')
    return new Response(challenge, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

/**
 * Meta Webhook Event Handler (POST)
 */
export async function POST(request: NextRequest) {
  try {
    const arrayBuffer = await request.arrayBuffer()
    const rawBodyBuffer = Buffer.from(arrayBuffer)
    const rawBody = rawBodyBuffer.toString('utf8')
    
    // Verify Webhook Signature (if APP_SECRET is configured)
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (appSecret) {
      const signature = request.headers.get('x-hub-signature-256')
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      
      const hmac = crypto.createHmac('sha256', appSecret)
      const digest = Buffer.from('sha256=' + hmac.update(rawBodyBuffer).digest('hex'), 'utf8')
      const checksum = Buffer.from(signature, 'utf8')
      
      if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        console.error('[WhatsApp Webhook] Invalid signature.')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = {}
    }
    
    const castedBody = body as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              from?: string
              id?: string
              timestamp?: string
              type?: string
              text?: { body?: string }
            }>
            statuses?: Array<{
              id?: string
              status?: string
              recipient_id?: string
              timestamp?: string
              errors?: unknown[]
            }>
          }
        }>
      }>
    }

    const entries = body.entry || []

    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        const value = change.value

        // 1. Process inbound customer messages
        const messages = value?.messages
        if (messages && Array.isArray(messages)) {
          for (const msg of messages) {
            const senderPhone = msg.from
            const messageText = msg.text?.body || (msg.type !== 'text' ? `[${msg.type || 'Media'} message]` : '')
            const waMessageId = msg.id
            const timestamp = msg.timestamp
            const contextWaId = (msg as { context?: { id?: string } })?.context?.id

            if (senderPhone && messageText) {
              await processInboundWhatsAppMessage({
                senderPhone,
                messageText,
                waMessageId,
                timestamp,
                contextWaId,
                rawPayload: body as Record<string, unknown>,
              })
            }
          }
        }

        // 2. Process message delivery status updates (sent, delivered, read, failed)
        const statuses = value?.statuses
        if (statuses && Array.isArray(statuses)) {
          for (const st of statuses) {
            if (st.id && st.status) {
              await processWhatsAppStatusUpdate({
                providerMessageId: st.id,
                status: st.status,
                recipientPhone: st.recipient_id,
                timestamp: st.timestamp,
                errors: st.errors,
                rawPayload: body as Record<string, unknown>,
              })
            }
          }
        }
      }
    }

    // Acknowledge receipt to Meta immediately (200 OK)
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 })
  } catch (err) {
    console.error('[WhatsApp Webhook] Processing error:', err)
    return NextResponse.json({ status: 'ERROR', error: (err as Error).message }, { status: 200 })
  }
}
