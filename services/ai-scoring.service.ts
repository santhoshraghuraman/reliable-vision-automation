/**
 * AI Lead Qualification & Scoring Service
 * Analyzes lead profile metadata, requirements, and business signals to produce
 * a structured qualification score (0-100), classification (HOT/WARM/COLD),
 * reasoning, recommended action, and tailored sales pitch.
 */

import { Lead } from '@/lib/types'

interface AIScoringOutput {
  score: number
  classification: 'HOT' | 'WARM' | 'COLD'
  reason: string
  recommended_action: string
  suggested_pitch: string
  confidence?: number
}

/**
 * Score a single lead using Gemini AI (with intelligent server-side heuristic fallback)
 */
export async function scoreLeadWithAI(lead: Lead): Promise<AIScoringOutput> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (geminiApiKey) {
    try {
      const result = await callGeminiAPI(lead, geminiApiKey)
      if (isValidScoreOutput(result)) {
        return normalizeScoreOutput(result)
      }
    } catch (err) {
      console.warn('[scoreLeadWithAI] Gemini API error, falling back to heuristic engine:', err)
    }
  }

  // Fallback heuristic scoring engine
  return evaluateLeadHeuristics(lead)
}

/**
 * Call Gemini REST API with structured JSON output
 */
async function callGeminiAPI(lead: Lead, apiKey: string): Promise<AIScoringOutput | null> {
  const prompt = `
You are an expert enterprise B2B sales development AI analyzing sales leads for a high-performance web agency.
Analyze the following lead data and return a JSON qualification assessment.

LEAD DETAILS:
- Business / Contact Name: ${lead.business || lead.name}
- Industry / Category: ${lead.category || 'Not specified'}
- Phone: ${lead.phone}
- Requirements / Pitch Notes / Metadata: ${lead.requirement || 'No notes provided'}
- Current Status: ${lead.status}
- Source: ${lead.source}

SCORING GUIDELINES:
- Score: Integer between 0 and 100
  - 80 to 100 = HOT (High commercial potential, urgent website need, high ticket transactions, strong sales fit)
  - 50 to 79 = WARM (Moderate fit, clear opportunity for a website upgrade or redesign, good potential)
  - 0 to 49 = COLD (Low immediate commercial intent, limited requirements, or low-fit category)

OUTPUT REQUIREMENTS:
Return ONLY valid raw JSON with this exact schema:
{
  "score": <integer 0-100>,
  "classification": "<HOT | WARM | COLD>",
  "reason": "<2-3 sentences explaining the assessment based on industry, website necessity, and commercial signals>",
  "recommended_action": "<1-2 actionable next steps for sales outreach, e.g. Call immediately with personalized demo>",
  "suggested_pitch": "<a customized 2-3 sentence elevator sales pitch tailored specifically to this business and industry>"
}
`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`

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
    throw new Error(`Gemini API returned status ${response.status}`)
  }

  const data = await response.json()
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) return null

  try {
    const parsed = JSON.parse(candidateText)
    return parsed as AIScoringOutput
  } catch {
    return null
  }
}

/**
 * Intelligent Heuristic Qualification Engine
 * Evaluates business category, requirement keywords, high-ticket signals, and sales potential
 */
export function evaluateLeadHeuristics(lead: Lead): AIScoringOutput {
  const req = (lead.requirement || '').toLowerCase()
  const cat = (lead.category || '').toLowerCase()
  const name = (lead.business || lead.name || '').toLowerCase()

  let score = 45 // Baseline score

  // 1. High-Value Category Multipliers
  const highValueCategories = [
    'resort', 'hotel', 'hospital', 'apartment', 'real estate', 'builder', 'developer',
    'jewel', 'automobile', 'car dealer', 'motorcycle', 'service apartment', 'architect',
    'interior', 'dental', 'clinic', 'lawyer', 'advocate', 'solar', 'manufacturing',
    'industrial', 'exporter', 'academy', 'school', 'college', 'restaurant'
  ]

  const moderateValueCategories = [
    'cycle', 'store', 'shop', 'dealer', 'electronics', 'furniture', 'hardware',
    'studio', 'agency', 'consultant', 'cafe', 'bakery', 'salon', 'spa'
  ]

  const isHighValueCat = highValueCategories.some((c) => cat.includes(c) || name.includes(c))
  const isModerateCat = moderateValueCategories.some((c) => cat.includes(c) || name.includes(c))

  if (isHighValueCat) {
    score += 25
  } else if (isModerateCat) {
    score += 15
  }

  // 2. Requirement / Website Need Signals
  if (req.includes('no website') || req.includes('no website at all') || req.includes('does not have a website')) {
    score += 18
  }
  if (req.includes('high-ticket') || req.includes('high ticket') || req.includes('credibility') || req.includes('high chance')) {
    score += 12
  }
  if (req.includes('enquiries') || req.includes('leads') || req.includes('competitors') || req.includes('listings')) {
    score += 8
  }
  if (req.includes('priority: high') || req.includes('urgent') || req.includes('immediate')) {
    score += 10
  }
  if (req.includes('priority: low')) {
    score -= 15
  }

  // 3. Completeness of Lead Profile
  if (lead.phone && lead.phone.length >= 10) {
    score += 5
  }
  if (lead.business && lead.business.length > 3) {
    score += 5
  }
  if (!lead.requirement || lead.requirement.trim().length === 0) {
    score -= 10
  }

  // Clamp score between 15 and 95
  score = Math.max(15, Math.min(95, Math.round(score)))

  // Classification
  let classification: 'HOT' | 'WARM' | 'COLD' = 'COLD'
  if (score >= 80) {
    classification = 'HOT'
  } else if (score >= 50) {
    classification = 'WARM'
  }

  // Reasoning synthesis
  const businessLabel = lead.business || lead.name
  const categoryLabel = lead.category || 'commercial'

  let reason = ''
  let recommended_action = ''
  let suggested_pitch = ''

  if (classification === 'HOT') {
    reason = `${businessLabel} operates in the ${categoryLabel} sector where an authoritative digital presence directly drives customer acquisition. Analysis indicates strong commercial intent and a clear opportunity to replace competitors with a modern website.`
    recommended_action = 'Schedule an immediate direct sales call with a tailored live website mockup and conversion case study.'
    suggested_pitch = `Hello ${businessLabel} team, we noticed your prospective clients frequently search online for ${categoryLabel} services. We build high-converting, professional websites that establish trust and convert local searches into direct qualified enquiries.`
  } else if (classification === 'WARM') {
    reason = `${businessLabel} has good baseline potential in the ${categoryLabel} industry. A modern, mobile-friendly landing page with integrated WhatsApp chat will capture local search traffic and boost repeat business.`
    recommended_action = 'Send an intro pitch highlighting client acquisition advantages, followed by a phone follow-up within 48 hours.'
    suggested_pitch = `Hi ${businessLabel}, having a modern website with instant WhatsApp enquiries helps ${categoryLabel} businesses stand out on Google and capture ready-to-buy customers.`
  } else {
    reason = `${businessLabel} currently has limited recorded requirements or low immediate commercial signals. Recommended for standard nurturing or verification before high-touch outreach.`
    recommended_action = 'Send initial introductory outreach message and monitor engagement for qualification signals.'
    suggested_pitch = `Hello ${businessLabel}, Reliable Vision specializes in crafting affordable, professional digital presence solutions for businesses looking to scale online.`
  }

  return {
    score,
    classification,
    reason,
    recommended_action,
    suggested_pitch,
    confidence: classification === 'HOT' ? 0.92 : classification === 'WARM' ? 0.85 : 0.72,
  }
}

function isValidScoreOutput(obj: unknown): obj is AIScoringOutput {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Partial<AIScoringOutput>
  return (
    typeof o.score === 'number' &&
    (o.classification === 'HOT' || o.classification === 'WARM' || o.classification === 'COLD') &&
    typeof o.reason === 'string' &&
    typeof o.recommended_action === 'string' &&
    typeof o.suggested_pitch === 'string'
  )
}

function normalizeScoreOutput(output: AIScoringOutput): AIScoringOutput {
  const score = Math.max(0, Math.min(100, Math.round(output.score)))
  let classification: 'HOT' | 'WARM' | 'COLD' = 'COLD'
  if (score >= 80) classification = 'HOT'
  else if (score >= 50) classification = 'WARM'

  return {
    ...output,
    score,
    classification,
    reason: output.reason.trim(),
    recommended_action: output.recommended_action.trim(),
    suggested_pitch: output.suggested_pitch.trim(),
  }
}
