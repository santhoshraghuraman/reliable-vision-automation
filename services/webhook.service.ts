/**
 * Webhook service — stub for future n8n integration
 * Handles inbound Meta webhook events and n8n callbacks
 */

// TODO: Future integration points:
// - verifyMetaWebhook(req) → validate webhook signature
// - processInboundMessage(payload) → update conversation/messages table
// - triggerN8nWorkflow(workflowId, data) → POST to n8n webhook URL
// - logWebhookEvent(event) → insert into webhook_events table

/**
 * Placeholder: Log a webhook event to Supabase
 * Will be called by the /api/webhooks/meta route
 */
export async function logWebhookEvent(
  source: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  // Future: Insert into webhook_events table via server-side Supabase client
  console.info('[Webhook Service] Webhook logging not yet implemented.', { source, eventType, payload })
}

// Environment variable stubs (to be added when integrating)
// N8N_WEBHOOK_URL — n8n webhook base URL (server-side only)
// META_WEBHOOK_VERIFY_TOKEN — Meta webhook verification token (server-side only)
// META_ACCESS_TOKEN — WhatsApp Cloud API token (server-side only)

/**
 * Dispatch an event to the n8n webhook (fire-and-forget).
 * Includes TEST_MODE guards in the payload contract.
 */
export async function dispatchToN8n(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const apiSecret = process.env.N8N_API_SECRET

  if (!webhookUrl) {
    console.warn('[Webhook Service] n8n dispatch skipped: N8N_WEBHOOK_URL not configured.')
    return
  }

  const isTestMode = process.env.TEST_MODE !== 'false'
  const testPhone = process.env.WHATSAPP_TEST_PHONE_NUMBER || '+919597482995'

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    testMode: isTestMode,
    testPhoneNumber: testPhone,
    data,
  }

  try {
    // Fire-and-forget without awaiting the response body
    // Using a very short timeout so it doesn't block the caller
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiSecret ? { 'Authorization': `Bearer ${apiSecret}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId)
        if (!res.ok) {
          console.error(`[Webhook Service] n8n returned HTTP ${res.status}`)
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId)
        console.error(`[Webhook Service] n8n dispatch failed:`, err)
      })
  } catch (err) {
    console.error(`[Webhook Service] n8n dispatch exception:`, err)
  }
}
