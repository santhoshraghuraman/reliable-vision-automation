/**
 * AI WhatsApp Conversation Intelligence & Follow-up Engine
 * Analyzes conversational context, detects customer intent,
 * determines lead temperature, generates recommended sales actions,
 * produces contextual WhatsApp replies, and enforces opt-out safeguards.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  ConversationAIAnalysis,
  ConversationIntent,
  Lead,
  Message,
} from '@/lib/types'

interface GeminiConversationAnalysisResult {
  intent: ConversationIntent
  temperature: 'HOT' | 'WARM' | 'COLD'
  confidence: number
  reasoning: string
  recommended_action: string
  suggested_reply: string
  requires_human_intervention: boolean
  should_continue_followup: boolean
}

/**
 * Main function to analyze a conversation thread with Gemini AI (with heuristic engine fallback)
 */
export async function analyzeConversationWithAI(params: {
  conversationId: string
  leadId: string
  latestMessageText?: string
}): Promise<ConversationAIAnalysis> {
  const { conversationId, leadId, latestMessageText } = params
  const supabase = getSupabaseAdmin()

  // 1. Fetch Lead context
  const { data: leadData } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()

  const lead = leadData as Lead | null

  // 2. Fetch conversation history (last 10 messages)
  const { data: messagesData } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(10)

  const messages = (messagesData as Message[]) || []

  // 3. Perform AI Analysis via Gemini or Fallback Heuristics
  let analysisResult: GeminiConversationAnalysisResult | null = null
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (geminiApiKey) {
    try {
      analysisResult = await callGeminiConversationAnalysis(lead, messages, latestMessageText, geminiApiKey)
    } catch (err) {
      console.warn('[analyzeConversationWithAI] Gemini API error, falling back to heuristic engine:', err)
    }
  }

  if (!analysisResult) {
    analysisResult = evaluateConversationHeuristics(lead, messages, latestMessageText)
  }

  // 4. Opt-Out & Follow-up Protection
  if (analysisResult.intent === 'NOT_INTERESTED' || analysisResult.intent === 'NEGATIVE') {
    analysisResult.should_continue_followup = false
    analysisResult.requires_human_intervention = true

    // Automatically update lead in Supabase
    await supabase
      .from('leads')
      .update({
        status: 'NOT_INTERESTED',
        opted_out: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    // Cancel any pending follow-ups for this lead
    await supabase
      .from('followups')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('lead_id', leadId)
      .eq('status', 'PENDING')
  } else if (analysisResult.temperature === 'HOT') {
    // 1. Mark conversation for human takeover to stop automated bots
    await supabase.from('conversations').update({
      human_takeover: true,
      status: 'handoff',
      updated_at: new Date().toISOString()
    }).eq('id', conversationId)

    // 2. Cancel automated follow-ups for HOT leads
    await supabase.from('followups').update({
      status: 'CANCELLED',
      updated_at: new Date().toISOString()
    }).eq('lead_id', leadId).eq('status', 'PENDING')

    // 3. Create Owner Notification
    if (lead) {
      await supabase.from('notifications').insert({
        lead_id: leadId,
        type: 'HOT_LEAD',
        title: `🔥 Hot Lead: ${lead.business || lead.name}`,
        message: `Customer is ready to engage. Intent: ${analysisResult.intent}.`,
        read: false,
      })
    }

    // 4. Update lead status to INTERESTED if previously cold/warm,
    // or if previously opted-out but now voluntarily re-engaging.
    if (lead && (lead.status === 'COLD' || lead.status === 'WARM' || lead.status === 'NOT_INTERESTED')) {
      const reEngagementUpdate: Record<string, unknown> = {
        status: 'INTERESTED',
        updated_at: new Date().toISOString(),
      }
      // Clear opt-out flag when the customer explicitly re-engages
      if (lead.status === 'NOT_INTERESTED') {
        reEngagementUpdate.opted_out = false
      }
      await supabase
        .from('leads')
        .update(reEngagementUpdate)
        .eq('id', leadId)
    }
  }

  // 5. Calculate numerical score for public.ai_scores
  const numericalScore =
    analysisResult.temperature === 'HOT' ? Math.max(80, analysisResult.confidence) :
    analysisResult.temperature === 'WARM' ? Math.min(79, Math.max(50, analysisResult.confidence)) :
    Math.min(49, 100 - analysisResult.confidence)

  // 6. Persist to public.ai_scores
  const { data: savedScore } = await supabase
    .from('ai_scores')
    .insert({
      lead_id: leadId,
      conversation_id: conversationId,
      score: numericalScore,
      classification: analysisResult.temperature,
      confidence: Number((analysisResult.confidence / 100).toFixed(2)),
      intent: `${analysisResult.intent}: ${analysisResult.recommended_action}`,
      reasoning: analysisResult.reasoning,
      requirement: analysisResult.suggested_reply,
    })
    .select()
    .single()

  // 7. Log decision to public.audit_logs
  await supabase.from('audit_logs').insert({
    lead_id: leadId,
    action: 'AI_CONVERSATION_ANALYZED',
    details: {
      conversation_id: conversationId,
      intent: analysisResult.intent,
      temperature: analysisResult.temperature,
      confidence: analysisResult.confidence,
      reasoning: analysisResult.reasoning,
      recommended_action: analysisResult.recommended_action,
      suggested_reply: analysisResult.suggested_reply,
      should_continue_followup: analysisResult.should_continue_followup,
    },
    actor: 'gemini-intelligence',
  })

  return {
    id: savedScore?.id,
    conversation_id: conversationId,
    lead_id: leadId,
    intent: analysisResult.intent,
    temperature: analysisResult.temperature,
    confidence: analysisResult.confidence,
    reasoning: analysisResult.reasoning,
    recommended_action: analysisResult.recommended_action,
    suggested_reply: analysisResult.suggested_reply,
    requires_human_intervention: analysisResult.requires_human_intervention,
    should_continue_followup: analysisResult.should_continue_followup,
    created_at: new Date().toISOString(),
  }
}

/**
 * Fetch the latest AI analysis for a conversation
 */
export async function getLatestConversationAnalysis(
  conversationId: string,
  leadId: string
): Promise<ConversationAIAnalysis | null> {
  const supabase = getSupabaseAdmin()

  const { data: score } = await supabase
    .from('ai_scores')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!score) return null

  // Extract intent and action from intent string
  const intentParts = (score.intent || '').split(': ')
  const rawIntent = intentParts[0] as ConversationIntent
  const validIntents: ConversationIntent[] = [
    'PRICING', 'INTERESTED', 'NOT_INTERESTED', 'REQUEST_CALLBACK',
    'REQUEST_DEMO', 'NEED_MORE_INFORMATION', 'POSITIVE', 'NEGATIVE', 'OTHER'
  ]
  const intent = validIntents.includes(rawIntent) ? rawIntent : 'OTHER'
  const recommended_action = intentParts[1] || 'Review conversation and respond to lead'

  return {
    id: score.id,
    conversation_id: conversationId,
    lead_id: leadId,
    intent,
    temperature: score.classification as 'HOT' | 'WARM' | 'COLD',
    confidence: Math.round((score.confidence || 0.85) * 100),
    reasoning: score.reasoning || 'AI analysis based on latest conversation context.',
    recommended_action,
    suggested_reply: score.requirement || 'Hello! Thanks for your message. How can we help your business today?',
    requires_human_intervention: intent === 'NOT_INTERESTED' || intent === 'REQUEST_CALLBACK',
    should_continue_followup: intent !== 'NOT_INTERESTED' && intent !== 'NEGATIVE',
    created_at: score.created_at,
  }
}

/**
 * Call Gemini 1.5 Flash API with structured JSON output
 */
async function callGeminiConversationAnalysis(
  lead: Lead | null,
  messages: Message[],
  latestMessageText: string | undefined,
  apiKey: string
): Promise<GeminiConversationAnalysisResult | null> {
  const businessName = lead?.business || lead?.name || 'Customer'
  const category = lead?.category || 'Business'

  // Format message history
  const historyText = messages.map((m) => {
    const sender = m.direction === 'INBOUND' ? 'Customer' : 'Reliable Vision (Sales Agent)'
    return `[${sender}]: ${m.message_text}`
  }).join('\n')

  const prompt = `
You are an expert conversational intelligence AI for "Reliable Vision", a premium B2B web design and automated WhatsApp lead-generation agency.
Analyze the following WhatsApp conversation between our sales agency and the client to classify customer intent, assess commercial temperature, provide strategic reasoning, and craft the next high-converting WhatsApp reply.

CLIENT DETAILS:
- Business / Contact: ${businessName}
- Industry / Category: ${category}
- Known Requirements: ${lead?.requirement || 'Website redesign / customer acquisition'}

CONVERSATION TRANSCRIPT:
${historyText || `[Customer]: ${latestMessageText || 'Hello'}`}

${latestMessageText ? `LATEST INBOUND MESSAGE:\n"${latestMessageText}"` : ''}

ANALYSIS INSTRUCTIONS:
1. "intent": Classify strictly as one of:
   - "PRICING" (Asking for prices, packages, costs, quotes)
   - "REQUEST_DEMO" (Asking to see portfolio, samples, mockups, or case studies)
   - "REQUEST_CALLBACK" (Asking to speak on phone, schedule a call, or meet)
   - "INTERESTED" (Positive interest in moving forward or getting started)
   - "NOT_INTERESTED" (Declining, saying no, asking to stop/unsubscribe)
   - "NEED_MORE_INFORMATION" (Asking what we do, how it works, questions)
   - "POSITIVE" (Friendly acknowledgment, thank you, positive remark)
   - "NEGATIVE" (Complaints, frustration, hostile feedback)
   - "OTHER" (Unclear or miscellaneous)

2. "temperature":
   - "HOT" (Ready to buy, asking for pricing/demos/calls, urgent need)
   - "WARM" (Curious, positive, asking questions)
   - "COLD" (Low interest, unengaged, or not interested)

3. "confidence": Integer 0 to 100 representing classification certainty.

4. "reasoning": 2-3 sentences explaining the assessment based on customer tone, specific keywords, and commercial fit.

5. "recommended_action": 1 tactical sentence advising the sales representative on what to do next.

6. "suggested_reply": A natural, professional WhatsApp reply under 240 characters.
   - Address their specific question directly.
   - Use at most 1 professional emoji.
   - Include clear pricing or demo invitation if requested.
   - End with a low-friction question (e.g. "Would 3:00 PM work for a quick preview?").
   - DO NOT include markdown bold or headers in the reply text.

7. "requires_human_intervention": boolean (true if complex query, request callback, or complaint).
8. "should_continue_followup": boolean (false only if NOT_INTERESTED or NEGATIVE).

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "intent": "<PRICING | REQUEST_DEMO | REQUEST_CALLBACK | INTERESTED | NOT_INTERESTED | NEED_MORE_INFORMATION | POSITIVE | NEGATIVE | OTHER>",
  "temperature": "<HOT | WARM | COLD>",
  "confidence": <integer 0-100>,
  "reasoning": "<string>",
  "recommended_action": "<string>",
  "suggested_reply": "<string>",
  "requires_human_intervention": <boolean>,
  "should_continue_followup": <boolean>
}
`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`

  let attempt = 0
  const maxRetries = 3
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      })

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`Gemini rate limit or server error: ${response.status}`)
        }
        console.warn(`[callGeminiConversationAnalysis] Client error: ${response.status}`)
        return null
      }

      const data = await response.json()
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!candidateText) return null

      try {
        const parsed = JSON.parse(candidateText) as GeminiConversationAnalysisResult
        return parsed
      } catch {
        return null
      }
    } catch (err) {
      attempt++
      if (attempt >= maxRetries) {
        console.warn(`[callGeminiConversationAnalysis] Failed after ${maxRetries} attempts:`, err)
        return null
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  return null
}

/**
 * Intelligent Offline Heuristic NLP Engine for Conversation Analysis
 */
function evaluateConversationHeuristics(
  lead: Lead | null,
  messages: Message[],
  latestMessageText?: string
): GeminiConversationAnalysisResult {
  const businessName = lead?.business || lead?.name || 'there'
  const text = (latestMessageText || messages.slice(-1)[0]?.message_text || '').toLowerCase()

  // 1. Check Not Interested / Opt-Out
  if (
    text.includes('not interested') ||
    text.includes('dont contact') ||
    text.includes("don't contact") ||
    text.includes('stop') ||
    text.includes('unsubscribe') ||
    text.includes('remove') ||
    text.includes('no thanks') ||
    text.includes('not needed') ||
    text.includes("don't need") ||
    text.includes('dont need') ||
    text.includes('do not need') ||
    text.includes('no need') ||
    text.includes('not right now') ||
    text.includes('not now') ||
    text.includes('not looking')
  ) {
    return {
      intent: 'NOT_INTERESTED',
      temperature: 'COLD',
      confidence: 96,
      reasoning: 'Customer explicitly declined services or requested to stop outreach.',
      recommended_action: 'Pause automated follow-ups and respect opt-out preference.',
      suggested_reply: 'Understood. Thank you for your time and have a great day ahead!',
      requires_human_intervention: true,
      should_continue_followup: false,
    }
  }

  // 2. Check Pricing Inquiry
  if (
    text.includes('price') ||
    text.includes('pricing') ||
    text.includes('cost') ||
    text.includes('rate') ||
    text.includes('how much') ||
    text.includes('charges') ||
    text.includes('package') ||
    text.includes('fees')
  ) {
    return {
      intent: 'PRICING',
      temperature: 'HOT',
      confidence: 94,
      reasoning: 'Customer is actively asking for package pricing and costs, indicating strong buying intent.',
      recommended_action: 'Provide transparent package tiers starting at ₹15,000 and offer a live demo.',
      suggested_reply: `Hello! Our website packages start at ₹15,000 including custom design, mobile optimization, and WhatsApp lead capture. Would you like to see a quick live preview?`,
      requires_human_intervention: false,
      should_continue_followup: true,
    }
  }

  // 3. Check Demo / Portfolio Request
  if (
    text.includes('demo') ||
    text.includes('sample') ||
    text.includes('portfolio') ||
    text.includes('show') ||
    text.includes('preview') ||
    text.includes('work') ||
    text.includes('links')
  ) {
    return {
      intent: 'REQUEST_DEMO',
      temperature: 'HOT',
      confidence: 92,
      reasoning: 'Customer wants to review past work, design samples, or a customized mockup.',
      recommended_action: 'Share portfolio link and offer to create a free mockup for their business.',
      suggested_reply: `Here are our recent client portfolio samples: https://reliablevision.com. We can also prepare a free 1-page concept mockup for ${businessName}. Shall we proceed?`,
      requires_human_intervention: false,
      should_continue_followup: true,
    }
  }

  // 4. Check Call / Meeting Request
  if (
    text.includes('call') ||
    text.includes('talk') ||
    text.includes('discuss') ||
    text.includes('phone') ||
    text.includes('meet') ||
    text.includes('schedule') ||
    /\b(call time|free time|good time|best time|available time|what time|callback time|appointment)\b/i.test(text)
  ) {
    return {
      intent: 'REQUEST_CALLBACK',
      temperature: 'HOT',
      confidence: 95,
      reasoning: 'Customer requested a direct phone call or meeting to discuss requirements.',
      recommended_action: 'Call customer immediately or confirm a preferred 15-minute time slot.',
      suggested_reply: `We would be happy to connect on a quick call! Would 3:00 PM today or 11:00 AM tomorrow work best for you?`,
      requires_human_intervention: true,
      should_continue_followup: true,
    }
  }

  // 5. Check Positive Interest
  if (
    text.includes('yes') ||
    text.includes('interested') ||
    text.includes('sure') ||
    text.includes('okay') ||
    text.includes('tell me more') ||
    text.includes('send details')
  ) {
    return {
      intent: 'INTERESTED',
      temperature: 'HOT',
      confidence: 90,
      reasoning: 'Customer confirmed interest in exploring website development services.',
      recommended_action: 'Present core value proposition and schedule a brief discovery call.',
      suggested_reply: `Great to hear! We help businesses like ${businessName} double direct enquiries through modern websites. Could you share what features you need most?`,
      requires_human_intervention: false,
      should_continue_followup: true,
    }
  }

  // 6. Check Information Inquiry
  if (
    text.includes('what') ||
    text.includes('how') ||
    text.includes('who') ||
    text.includes('where') ||
    text.includes('info') ||
    text.includes('explain')
  ) {
    return {
      intent: 'NEED_MORE_INFORMATION',
      temperature: 'WARM',
      confidence: 82,
      reasoning: 'Customer is seeking clarity on services and implementation details.',
      recommended_action: 'Explain core services clearly and provide an easy next step.',
      suggested_reply: `We design high-speed, modern websites with built-in WhatsApp chat and Google SEO optimization. Would you like a 2-minute overview of our process?`,
      requires_human_intervention: false,
      should_continue_followup: true,
    }
  }

  // 7. General Friendly / Positive Acknowledgment
  if (text.includes('thank') || text.includes('good') || text.includes('great') || text.includes('nice')) {
    return {
      intent: 'POSITIVE',
      temperature: 'WARM',
      confidence: 80,
      reasoning: 'Customer sent a courteous response acknowledging prior outreach.',
      recommended_action: 'Maintain warm engagement and guide towards a discovery conversation.',
      suggested_reply: `You're very welcome! Whenever you're ready to upgrade your online presence for ${businessName}, we're here to help.`,
      requires_human_intervention: false,
      should_continue_followup: true,
    }
  }

  // 8. Default Other
  return {
    intent: 'OTHER',
    temperature: 'WARM',
    confidence: 70,
    reasoning: 'General message received. Analysis suggests maintaining active dialogue.',
    recommended_action: 'Send friendly inquiry to clarify customer requirement.',
    suggested_reply: `Hello! Thanks for reaching out to Reliable Vision. How can we assist ${businessName} with your website goals today?`,
    requires_human_intervention: false,
    should_continue_followup: true,
  }
}
