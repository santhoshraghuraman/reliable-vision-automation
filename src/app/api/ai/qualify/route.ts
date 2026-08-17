/**
 * POST /api/ai/qualify
 *
 * Calls Google Gemini AI to analyze a WhatsApp reply, classify the lead,
 * and optionally generate an AI response.
 *
 * Architecture:
 *   Webhook → This route → Gemini API → Supabase update → WhatsApp send
 *
 * Request Body:
 * {
 *   message: string,          // Customer's inbound message text
 *   lead_id: string,          // Supabase lead UUID
 *   conversation_id: string,  // Supabase conversation UUID
 *   lead_name?: string,       // Lead's name for personalization
 *   lead_business?: string,   // Lead's business name
 * }
 *
 * Response:
 * {
 *   intent: string,
 *   temperature: "hot" | "warm" | "cold",
 *   reason: string,
 *   should_reply: boolean,
 *   reply: string | null,
 *   auto_reply_sent: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

// v1beta is the correct endpoint for AQ. format auth keys issued by Google AI Studio.
// Verified available models for this API key via ListModels API:
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

// Allowed temperature values - anything else is rejected
const VALID_TEMPERATURES = ['hot', 'warm', 'cold'] as const;
type Temperature = (typeof VALID_TEMPERATURES)[number];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, lead_id, conversation_id, lead_name, lead_business } = body;

    // --- Validate inputs ---
    if (!message || !lead_id || !conversation_id) {
      return NextResponse.json(
        { error: 'Missing required fields: message, lead_id, conversation_id' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        {
          error:
            'BLOCKED: GEMINI_API_KEY not configured. Add it to .env.local. Get it free from https://ai.google.dev',
          config_required: true,
        },
        { status: 503 }
      );
    }

    const supabase = createServiceRoleClient();

    // --- Fetch business settings from Supabase ---
    const { data: settings } = await supabase
      .from('business_settings')
      .select('business_name, services, website, ai_instructions, auto_reply_enabled')
      .limit(1)
      .single();

    const businessName = settings?.business_name || 'Reliable Vision | Web Studio';
    const portfolioUrl = settings?.website || 'https://santhosh-portfolio-gamma.vercel.app/';
    const services = (settings?.services || []).join(', ');
    const customInstructions = settings?.ai_instructions || '';
    const autoReplyEnabled = settings?.auto_reply_enabled !== false; // default true

    // --- Check if conversation is in human takeover mode ---
    const { data: conv } = await supabase
      .from('conversations')
      .select('human_takeover, status')
      .eq('id', conversation_id)
      .single();

    const isHumanTakeover = conv?.human_takeover === true || conv?.status === 'handoff';

    // --- Build Gemini Prompt ---
    const systemPrompt = `You are the AI assistant for ${businessName}, a professional web studio based in Tamil Nadu, India.

Services offered: ${services}
Portfolio: ${portfolioUrl}
${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

You must analyze the customer's WhatsApp message and return a structured JSON response.

Classification rules:
- HOT: Customer is ready to buy, asking for pricing, requesting a call/meeting, expressing urgency, or saying they want to proceed
- WARM: Customer is interested, asking about services/portfolio, requesting more info, showing curiosity
- COLD: Customer says not interested, stop contact, wrong number, or gives a very unclear/unrelated reply

You MUST return ONLY valid JSON in this exact format (no markdown, no explanation, just raw JSON):
{
  "intent": "one of: pricing_inquiry | service_inquiry | portfolio_request | meeting_request | objection | not_interested | general_reply | unclear",
  "temperature": "hot | warm | cold",
  "reason": "one sentence explaining why you classified this temperature",
  "should_reply": true or false,
  "reply": "your personalized WhatsApp reply message (max 300 chars) OR null if should_reply is false"
}

For the reply field (if should_reply is true):
- Be friendly and professional
- Include the portfolio URL if discussing services: ${portfolioUrl}
- Address the customer by name if known: ${lead_name || 'the customer'}
- Mention their business if known: ${lead_business || 'their business'}
- End with a clear next step (call, visit portfolio, provide pricing)
- Keep under 300 characters for WhatsApp readability`;

    const userPrompt = `Customer message: "${message}"`;

    // --- Call Gemini API with model fallback ---
    const geminiPayload = {
      contents: [
        {
          parts: [{ text: systemPrompt + '\n\n' + userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    };

    let geminiResponse: Response | null = null;
    let usedModel = '';
    let lastError = '';

    for (const modelName of GEMINI_MODELS) {
      const url = `${GEMINI_BASE}/${modelName}:generateContent?key=${geminiKey}`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
        });
        if (resp.ok) {
          geminiResponse = resp;
          usedModel = modelName;
          break;
        }
        // If responseMimeType causes 400 error on older endpoint, retry without it
        const errBody = await resp.text();
        lastError = `[${modelName}] HTTP ${resp.status}: ${errBody}`;
        console.warn('[AI Qualify] Model call warning:', modelName, errBody);

        if (resp.status === 400 && errBody.includes('responseMimeType')) {
          // Retry without responseMimeType
          const retryPayload = {
            ...geminiPayload,
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
          };
          const retryResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(retryPayload),
          });
          if (retryResp.ok) {
            geminiResponse = retryResp;
            usedModel = modelName;
            break;
          }
        }

        if (resp.status !== 404 && resp.status !== 400) {
          return NextResponse.json(
            { error: 'Gemini API error', details: errBody, model_tried: modelName },
            { status: 502 }
          );
        }
      } catch (fetchErr: any) {
        lastError = `[${modelName}] Network error: ${fetchErr.message}`;
        console.error('[AI Qualify] Fetch error:', lastError);
      }
    }

    if (!geminiResponse) {
      return NextResponse.json(
        {
          error: 'No compatible Gemini model found. All models returned errors.',
          models_tried: GEMINI_MODELS,
          last_error: lastError,
        },
        { status: 502 }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // --- Parse and validate Gemini JSON output ---
    let aiResult: {
      intent: string;
      temperature: Temperature;
      reason: string;
      should_reply: boolean;
      reply: string | null;
    };

    try {
      // Robust JSON extraction: strip markdown & locate top-level JSON object
      let cleanJson = rawText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }
      aiResult = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[AI Qualify] Strict JSON parse failed, attempting regex extraction:', rawText);
      
      // Fallback regex parsing if JSON string was slightly cut off or contained trailing text
      const intentMatch = rawText.match(/"intent"\s*:\s*"([^"]+)"/i);
      const tempMatch = rawText.match(/"temperature"\s*:\s*"(hot|warm|cold)"/i);
      const reasonMatch = rawText.match(/"reason"\s*:\s*"([^"]+)"/i);
      const shouldReplyMatch = rawText.match(/"should_reply"\s*:\s*(true|false)/i);
      const replyMatch = rawText.match(/"reply"\s*:\s*"([^"]+)"/i);

      if (tempMatch) {
        aiResult = {
          intent: intentMatch ? intentMatch[1] : 'general_reply',
          temperature: (tempMatch[1].toLowerCase() as Temperature) || 'cold',
          reason: reasonMatch ? reasonMatch[1] : 'Classified via fallback parser',
          should_reply: shouldReplyMatch ? shouldReplyMatch[1] === 'true' : false,
          reply: replyMatch ? replyMatch[1] : null,
        };
      } else {
        return NextResponse.json(
          { error: 'Gemini returned invalid JSON. Raw output: ' + rawText },
          { status: 502 }
        );
      }
    }

    // --- Strictly validate temperature value ---
    if (!VALID_TEMPERATURES.includes(aiResult.temperature)) {
      console.error('[AI Qualify] Invalid temperature from Gemini:', aiResult.temperature);
      aiResult.temperature = 'warm'; // Safe fallback — do NOT corrupt DB with invalid value
    }

    // --- Update lead temperature in Supabase ---
    await supabase
      .from('leads')
      .update({
        status: aiResult.temperature,
        last_reply_at: new Date().toISOString(),
        campaign_status: 'replied',
      })
      .eq('id', lead_id);

    // --- Log AI result to ai_logs ---
    await supabase.from('ai_logs').insert({
      lead_id,
      conversation_id,
      input: message,
      output: JSON.stringify(aiResult),
      intent: aiResult.intent,
      lead_temperature: aiResult.temperature,
      reason: aiResult.reason,
      should_reply: aiResult.should_reply,
      reply_sent: aiResult.should_reply && !isHumanTakeover ? aiResult.reply : null,
      model: usedModel,
    });

    // --- Auto-reply via WhatsApp if conditions are met ---
    let autoReplySent = false;

    if (aiResult.should_reply && aiResult.reply && autoReplyEnabled && !isHumanTakeover) {
      // Get lead phone for sending
      const { data: lead } = await supabase
        .from('leads')
        .select('phone')
        .eq('id', lead_id)
        .single();

      if (lead?.phone) {
        // Call our own WhatsApp send route
        const sendResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/send`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: lead.phone,
              message: aiResult.reply,
              lead_id,
              conversation_id,
              is_ai_generated: true,
            }),
          }
        );

        const sendResult = await sendResponse.json();
        autoReplySent = sendResult.success === true;

        if (!sendResult.success) {
          console.error('[AI Qualify] Auto-reply send failed:', sendResult.error);
        }
      }
    }

    // --- Create hot lead notification if temperature is hot ---
    if (aiResult.temperature === 'hot') {
      await supabase.from('notifications').insert({
        lead_id,
        type: 'hot_lead',
        title: '🔥 Hot Lead Alert!',
        message: `${lead_name || 'A lead'} from ${lead_business || 'a business'} is HOT — Intent: ${aiResult.intent}`,
        read: false,
      });
    }

    return NextResponse.json({
      intent: aiResult.intent,
      temperature: aiResult.temperature,
      reason: aiResult.reason,
      should_reply: aiResult.should_reply,
      reply: aiResult.reply,
      auto_reply_sent: autoReplySent,
      human_takeover_active: isHumanTakeover,
    });
  } catch (err: any) {
    console.error('[AI Qualify] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
