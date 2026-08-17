/**
 * GET/POST /api/webhook/whatsapp
 *
 * Handles the real Meta WhatsApp Cloud API webhook.
 *
 * GET  → Meta webhook verification handshake (required to register webhook)
 * POST → Receives inbound WhatsApp messages from customers
 *
 * Architecture:
 *   Customer replies on WhatsApp
 *   → Meta sends POST to this URL
 *   → We validate the event
 *   → Find lead by phone number
 *   → Create/find conversation
 *   → Save inbound message (deduplicated by wamid)
 *   → Call Gemini AI to qualify and auto-reply
 *
 * IMPORTANT: This endpoint MUST be on an HTTPS URL.
 * Meta CANNOT send webhooks to http://localhost
 * For local testing: use ngrok → ngrok http 3000
 * Then set webhook URL in Meta Developer Portal as: https://xxxx.ngrok.io/api/webhook/whatsapp
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

// --- GET: Meta Webhook Verification Handshake ---
// When you configure the webhook URL in Meta Developer Portal,
// Meta sends this GET request to verify ownership.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Meta verification successful');
    // Return the challenge as plain text — Meta requires this exact response
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[Webhook] Meta verification FAILED. Token mismatch or wrong mode.');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// --- POST: Receive Inbound WhatsApp Messages ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log for debugging (remove in production if verbose)
    console.log('[Webhook] Received payload:', JSON.stringify(body, null, 2));

    // Safety check: ensure this is a WhatsApp Business Platform event
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const supabase = createServiceRoleClient();

    // Process each entry (Meta can batch multiple events)
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // --- Process incoming messages ---
        for (const message of value.messages || []) {
          await processInboundMessage(supabase, message, value);
        }

        // --- Process delivery/read status updates (optional logging) ---
        for (const status of value.statuses || []) {
          await processStatusUpdate(supabase, status);
        }
      }
    }

    // IMPORTANT: Always return 200 to Meta within 20 seconds
    // Otherwise Meta will retry the webhook (causing duplicate processing)
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err: any) {
    console.error('[Webhook] Error processing payload:', err);
    // Still return 200 to prevent Meta from retrying on our server errors
    return NextResponse.json({ status: 'error_handled' }, { status: 200 });
  }
}

// ============================================================
// HELPER: Process a single inbound message
// ============================================================
async function processInboundMessage(supabase: any, message: any, value: any) {
  try {
    // Only handle text messages for now
    if (message.type !== 'text') {
      console.log('[Webhook] Non-text message type ignored:', message.type);
      return;
    }

    const wamid = message.id;                          // e.g. "wamid.xxxxx"
    const senderPhone = message.from;                  // e.g. "919876543210" (no +)
    const messageText = message.text?.body || '';
    const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

    if (!senderPhone || !messageText) return;

    // --- Deduplication: Check if this wamid was already processed ---
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('external_message_id', wamid)
      .single();

    if (existingMsg) {
      console.log('[Webhook] Duplicate wamid skipped:', wamid);
      return;
    }

    // --- Normalize phone: Meta sends without + (e.g. 919876543210) ---
    // Our DB stores with + prefix (e.g. +919876543210)
    const normalizedPhone = senderPhone.startsWith('+') ? senderPhone : `+${senderPhone}`;

    // --- Find lead by phone number ---
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('id, name, business, status, campaign_status')
      .eq('phone', normalizedPhone)
      .single();

    if (leadErr || !lead) {
      console.warn('[Webhook] Unknown sender:', normalizedPhone, 'Not in leads database.');
      // We do NOT create unknown leads automatically — only imported leads are valid
      return;
    }

    // --- Find or create conversation ---
    let conversationId: string;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, human_takeover, status')
      .eq('lead_id', lead.id)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: timestamp })
        .eq('id', conversationId);
    } else {
      // Create new conversation
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          status: 'active',
          last_message_at: timestamp,
          human_takeover: false,
        })
        .select('id')
        .single();

      if (convErr) {
        console.error('[Webhook] Failed to create conversation:', convErr);
        return;
      }
      conversationId = newConv.id;
    }

    // --- Save inbound message to Supabase ---
    const { error: msgErr } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      lead_id: lead.id,
      direction: 'inbound',
      message: messageText,
      message_type: 'text',
      is_ai_generated: false,
      external_message_id: wamid,
    });

    if (msgErr) {
      // Could be a unique constraint violation (dedup) — safe to ignore
      console.warn('[Webhook] Message insert warning:', msgErr.message);
      if (msgErr.code === '23505') return; // Unique constraint = already processed
    }

    // --- Update lead campaign_status to 'replied' ---
    await supabase
      .from('leads')
      .update({
        campaign_status: 'replied',
        last_reply_at: timestamp,
      })
      .eq('id', lead.id);

    console.log(`[Webhook] Saved message from ${lead.name} (${normalizedPhone}): "${messageText}"`);

    // --- Trigger Gemini AI qualification ---
    // Fire and forget — we already returned 200 to Meta
    // We use setImmediate/process.nextTick equivalent via async call
    triggerAIQualification({
      message: messageText,
      lead_id: lead.id,
      conversation_id: conversationId,
      lead_name: lead.name,
      lead_business: lead.business,
    });
  } catch (err) {
    console.error('[Webhook] processInboundMessage error:', err);
  }
}

// ============================================================
// HELPER: Trigger Gemini AI (non-blocking)
// ============================================================
async function triggerAIQualification(params: {
  message: string;
  lead_id: string;
  conversation_id: string;
  lead_name: string;
  lead_business: string;
}) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${appUrl}/api/ai/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Webhook→AI] Gemini qualification failed:', err);
    } else {
      const result = await response.json();
      console.log(
        `[Webhook→AI] Lead ${params.lead_id} classified as ${result.temperature} | Intent: ${result.intent}`
      );
    }
  } catch (err) {
    console.error('[Webhook→AI] Unexpected error calling /api/ai/qualify:', err);
  }
}

// ============================================================
// HELPER: Process delivery/read status updates
// ============================================================
async function processStatusUpdate(supabase: any, status: any) {
  try {
    const wamid = status.id;
    const deliveryStatus = status.status; // sent | delivered | read | failed

    if (!wamid || !deliveryStatus) return;

    // Update the message record with delivery status if we have a matching wamid
    await supabase
      .from('messages')
      .update({ message_type: deliveryStatus === 'failed' ? 'system' : 'text' })
      .eq('external_message_id', wamid);

    console.log(`[Webhook] Status update: ${wamid} → ${deliveryStatus}`);
  } catch (err) {
    console.error('[Webhook] processStatusUpdate error:', err);
  }
}
