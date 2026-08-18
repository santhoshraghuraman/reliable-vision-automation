/**
 * AI Service — stub for future Gemini integration
 * Will handle lead qualification, scoring, and conversation intelligence
 */

// TODO: Future integration points when Gemini is connected:
// - qualifyLead(leadId) → call Gemini to score and classify a lead
// - generateFollowUpMessage(leadId, context) → AI-generated WhatsApp message
// - analyzeConversation(conversationId) → sentiment analysis
// - updateLeadStatus(leadId, status) → update HOT/WARM/COLD based on AI score

/**
 * Placeholder: Score a lead using Gemini (future implementation)
 * Will call Gemini API via n8n or a server-side API route
 * Result will be stored in the ai_scores table
 */
export async function scoreLeadWithAI(leadId: string): Promise<void> {
  // Future: POST /api/ai/score with leadId
  // n8n workflow picks it up and runs Gemini
  // Result is saved to ai_scores table
  // Lead status is updated to HOT/WARM/COLD
  console.info('[AI Service] Lead scoring not yet implemented. Lead ID:', leadId)
}

export type AIServiceInterface = typeof scoreLeadWithAI
