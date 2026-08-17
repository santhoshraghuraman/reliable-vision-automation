import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Fallback list of models, similar to what we use in qualify/route.ts
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

export async function POST(request: NextRequest) {
  try {
    const { campaign_id, campaign_lead_id, limit = 10 } = await request.json();

    if (!campaign_id && !campaign_lead_id) {
      return NextResponse.json({ error: 'Missing campaign_id or campaign_lead_id' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const supabase = createServiceRoleClient();

    // 1. Fetch eligible campaign_leads that need personalization
    // Strict rules:
    // - personalization_status = 'pending' (Idempotency check)
    // - status = 'pending' (not already contacted)
    
    let query = supabase
      .from('campaign_leads')
      .select(`
        id,
        campaign_id,
        lead_id,
        personalization_status,
        campaigns (
          message_template
        ),
        leads (
          id,
          name,
          business,
          phone,
          website_status,
          eligible_for_outreach,
          status,
          opted_out
        )
      `)
      .eq('personalization_status', 'pending');
      
    if (campaign_lead_id) {
      query = query.eq('id', campaign_lead_id);
    } else {
      query = query.eq('campaign_id', campaign_id).limit(limit);
    }

    const { data: campaignLeads, error: clErr } = await query;

    if (clErr) {
      return NextResponse.json({ error: 'Failed to fetch campaign leads', details: clErr }, { status: 500 });
    }

    if (!campaignLeads || campaignLeads.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No pending leads require personalization.' });
    }

    const results = [];

    // 2. Process each lead
    for (const cl of campaignLeads as any[]) {
      const lead = Array.isArray(cl.leads) ? cl.leads[0] : cl.leads;
      const campaign = Array.isArray(cl.campaigns) ? cl.campaigns[0] : cl.campaigns;

      // STRICT VALIDATION (Double Check)
      if (
        lead.website_status !== 'NO_WEBSITE' ||
        lead.eligible_for_outreach !== true ||
        lead.status === 'lost' ||
        lead.opted_out === true ||
        !lead.phone
      ) {
        await supabase
          .from('campaign_leads')
          .update({
            personalization_status: 'failed',
            personalization_error: 'Lead failed strict validation for AI personalization.'
          })
          .eq('id', cl.id);
          
        results.push({ lead_id: lead.id, status: 'validation_failed' });
        continue;
      }

      // 3. Generate Personalization using Gemini REST API
      try {
        const baseTemplate = "We came across {{business}}. We help businesses build professional websites to improve their online presence.";

        const promptText = `
          You are a professional outreach assistant. 
          Your goal is to generate a short, professional WhatsApp outreach paragraph for a local business.
          
          Here is the verified data for the business you are messaging:
          - Business Name: ${lead.business}
          
          MESSAGE STRUCTURE:
          "${baseTemplate}"

          CRITICAL RULES FOR GENERATION:
          1. Replace the bracketed variables (or {{variables}}) in the message structure with the actual verified data provided above.
          2. The output should be approximately 1–3 short sentences, personalized using the available lead data, natural, professional, and suitable for business outreach.
          3. DO NOT invent facts. Use ONLY factual, simple language based strictly on the verified data above.
          4. NEVER generate claims such as "3x more leads", "guaranteed customers", "increase sales by X%", "double enquiries", "best", "leading", or ANY numerical performance claim.
          5. Do NOT claim the business has no website or needs a website unless you are replacing the base template gracefully.
          6. Do NOT invent services, achievements, years of operation, customer counts, revenue, rankings, or reviews.
          7. Output ONLY the middle personalized paragraph.
          8. NEVER include a greeting like "Hi Name".
          9. NEVER include a closing question like "Would you be interested in a quick demo?".
          10. NEVER include an opt-out message like "Reply STOP to unsubscribe".
          11. NEVER include quotation marks around the response, labels like "Message:", or emojis unless genuinely useful inside the paragraph.
        `;

        const geminiPayload = {
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 250,
          },
        };

        let geminiResponse: Response | null = null;
        let usedModel = '';

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
          } catch (e) {
            // Ignore fetch error, try next model
          }
        }

        if (!geminiResponse) {
          throw new Error('All Gemini models failed to generate content.');
        }

        const geminiData = await geminiResponse.json();
        const generatedMessage = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        if (!generatedMessage) {
          throw new Error("Gemini returned an empty response.");
        }

        // Output Validation against unverified claims
        const invalidPhrases = [
          /\b3x\b/i, /increase.*sales/i, /\bguarantee/i, /\bdouble\b/i, /%/,
          /\bbest\b/i, /\btop\b/i, /\bleading\b/i, /\bnumber one\b/i, /[0-9]+\s*customers/i
        ];

        const hasInvalidClaim = invalidPhrases.some(regex => regex.test(generatedMessage));
        
        if (hasInvalidClaim) {
           throw new Error("Generated message failed policy validation (contained unverified claims/metrics).");
        }

        // 4. Store the generated message safely
        await supabase
          .from('campaign_leads')
          .update({
            personalized_message: generatedMessage,
            personalization_status: 'completed',
            personalization_error: null
          })
          .eq('id', cl.id);

        results.push({ lead_id: lead.id, status: 'success', message: generatedMessage, model: usedModel });

      } catch (aiErr: any) {
        console.error(`[AI Personalize] Error for lead ${lead.id}:`, aiErr);
        
        // 5. Handle AI failures gracefully (Do not mark as success)
        await supabase
          .from('campaign_leads')
          .update({
            personalization_status: 'failed',
            personalization_error: aiErr.message || 'Unknown AI Error'
          })
          .eq('id', cl.id);

        results.push({ lead_id: lead.id, status: 'ai_error', error: aiErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: campaignLeads.length,
      results
    });

  } catch (err: any) {
    console.error('[AI Personalize] Fatal Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
