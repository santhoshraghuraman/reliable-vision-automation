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
