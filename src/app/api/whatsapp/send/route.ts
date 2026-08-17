/**
 * POST /api/whatsapp/send
 *
 * Sends a real WhatsApp message via Meta WhatsApp Cloud API.
 *
 * Architecture:
 *   CRM / Cron / Webhook → This route → Meta API → Customer's WhatsApp
 *
 * Request Body:
 * {
 *   phone: string,           // E.164 format e.g. "+919876543210"
 *   message: string,         // Plain text message to send
 *   lead_id: string,         // Supabase lead UUID
 *   conversation_id?: string // Optional: link to existing conversation
 * }
 *
 * Response:
 * { success: true, wamid: string }           — on success
 * { success: false, error: string }          — on failure
 *
 * WhatsApp Cloud API Limits (as of 2024):
 * - New phone numbers can message only verified contacts initially
 * - First messages to new contacts MUST use approved templates
 * - Replies to existing conversations can use free-form text within 24h window
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

const WHATSAPP_API_VERSION = 'v19.0';
const TEMPLATE_NAME = 'reliable_vision_outreach_v3';
const TEMPLATE_LANGUAGE = 'en';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { lead_id, campaign_lead_id } = body;

    if (!lead_id && !campaign_lead_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: lead_id or campaign_lead_id' },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: 'BLOCKED: WhatsApp credentials not configured.',
          config_required: true,
        },
        { status: 503 }
      );
    }

    const supabase = createServiceRoleClient();

    // 1. Fetch Campaign Lead Data (Authoritative source if campaign_lead_id is provided)
    let campaignLead;
    let lead;

    if (campaign_lead_id) {
      // Primary authoritative path for the queue processor
      const { data: clData, error: clErr } = await supabase
        .from('campaign_leads')
        .select('*, leads(*)')
        .eq('id', campaign_lead_id)
        .single();
        
      if (clErr || !clData) {
        return NextResponse.json({ success: false, error: 'Campaign lead not found.' }, { status: 404 });
      }
      
      campaignLead = clData;
      lead = clData.leads;
      
      // Verify mismatch if lead_id was also provided
      if (lead_id && lead.id !== lead_id) {
        return NextResponse.json({ success: false, error: 'Mismatch between lead_id and campaign_lead_id.' }, { status: 400 });
      }
      
      lead_id = lead.id;
    } else if (lead_id) {
      // Legacy fallback path for manual sends that only provide lead_id
      const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .select('*, campaign_leads(*)')
        .eq('id', lead_id)
        .single();
        
      if (leadErr || !leadData) {
        return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
      }
      
      lead = leadData;
      // Do NOT use .single() on campaign_leads array, just grab the most recent one
      if (lead.campaign_leads && lead.campaign_leads.length > 0) {
        // Sort to get the most recent or pending one if possible, or just the first
        campaignLead = lead.campaign_leads[0];
      }
    }

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }

    if (!campaignLead) {
      return NextResponse.json({ success: false, error: 'Lead is not part of any campaign.' }, { status: 400 });
    }

    // 2. Strict Eligibility Checks
    if (!lead.eligible_for_outreach) {
      return NextResponse.json({ success: false, error: 'Lead is not eligible for outreach.' }, { status: 403 });
    }
    if (lead.website_status !== 'NO_WEBSITE') {
      return NextResponse.json({ success: false, error: 'Lead does not have NO_WEBSITE status.' }, { status: 403 });
    }
    if (campaignLead.personalization_status !== 'completed' || !campaignLead.personalized_message) {
      return NextResponse.json({ success: false, error: 'AI Personalization is not completed for this lead.' }, { status: 403 });
    }
    if (lead.opted_out) {
      return NextResponse.json({ success: false, error: 'Lead has opted out.' }, { status: 403 });
    }
    if (lead.campaign_status === 'contacted') {
      return NextResponse.json({ success: false, error: 'Lead has already been contacted (Duplicate Send Protection).' }, { status: 403 });
    }
    if (!lead.phone) {
      return NextResponse.json({ success: false, error: 'Lead does not have a valid phone number.' }, { status: 400 });
    }

    // 3. Normalize Phone
    const normalizedPhone = lead.phone.replace(/\s+/g, '').replace(/-/g, '');
    let e164Phone = normalizedPhone.startsWith('+') ? normalizedPhone.replace('+', '') : normalizedPhone;

    // 4. TEST_MODE Protection
    const isTestMode = process.env.TEST_MODE !== 'false'; // Defaults to true
    if (isTestMode) {
      const testDestination = process.env.TEST_DESTINATION_PHONE;
      if (!testDestination) {
         return NextResponse.json({ success: false, error: 'TEST_MODE is enabled but TEST_DESTINATION_PHONE is not configured in .env.local.' }, { status: 500 });
      }
      const normTest = testDestination.replace(/\s+/g, '').replace(/-/g, '');
      const e164Test = normTest.startsWith('+') ? normTest.replace('+', '') : normTest;
      
      // Override destination to safe test number
      console.log(`[TEST_MODE] Rerouting message intended for ${e164Phone} to test destination ${e164Test}`);
      e164Phone = e164Test;
    }

    // 5. Build Meta Template Payload
    const metaApiUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`;
    
    // Fallback to business name if lead name is missing
    const customerName = lead.name || lead.business || 'Business Owner';

    const metaPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: e164Phone,
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: {
          code: TEMPLATE_LANGUAGE
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                parameter_name: "customer_name",
                type: "text",
                text: customerName
              },
              {
                parameter_name: "personalized_message",
                type: "text",
                text: campaignLead.personalized_message
              }
            ]
          }
        ]
      }
    };

    // 6. Send to Meta API
    let metaResponse;
    let metaData;
    try {
      metaResponse = await fetch(metaApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metaPayload),
      });
      metaData = await metaResponse.json();
    } catch (e: any) {
      return NextResponse.json({ success: false, error: 'Network failure communicating with Meta API', details: e.message }, { status: 502 });
    }

    if (!metaResponse.ok) {
      console.error('[WhatsApp Send] Meta API Error:', metaData);
      return NextResponse.json(
        {
          success: false,
          error: metaData?.error?.message || 'Meta WhatsApp API returned an error.',
          meta_error: metaData?.error,
        },
        { status: metaResponse.status }
      );
    }

    const wamid = metaData?.messages?.[0]?.id;

    // 7. Save to Supabase (Preserving original conversation logic)
    let convId = null;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('lead_id', lead_id)
      .single();

    if (existingConv) {
      convId = existingConv.id;
    } else {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ lead_id, status: 'active' })
        .select('id')
        .single();
      convId = newConv?.id;
    }

    if (convId) {
      await supabase.from('messages').insert({
        conversation_id: convId,
        lead_id,
        direction: 'outbound',
        message: campaignLead.personalized_message,
        message_type: 'template', // Updated to template
        is_ai_generated: true,
        external_message_id: wamid || null,
      });

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convId);
    }

    // 8. Update lead status
    await supabase
      .from('leads')
      .update({
        campaign_status: 'contacted',
        last_message_at: new Date().toISOString(),
      })
      .eq('id', lead_id);

    return NextResponse.json({
      success: true,
      wamid,
      conversation_id: convId,
      test_mode: isTestMode
    });
  } catch (err: any) {
    console.error('[WhatsApp Send] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
