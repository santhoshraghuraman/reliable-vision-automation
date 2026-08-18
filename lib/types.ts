/**
 * TypeScript types for Reliable Vision CRM
 * Compatible with Supabase database schema
 */

export type LeadStatus =
  | 'COLD'
  | 'WARM'
  | 'HOT'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'CONVERTED'

export type LeadSource = 'excel' | 'meta' | 'manual' | 'n8n' | 'whatsapp'

export interface AIScoreResult {
  id?: string
  lead_id: string
  score: number
  classification: 'HOT' | 'WARM' | 'COLD'
  reason: string
  recommended_action: string
  suggested_pitch: string
  confidence?: number
  created_at?: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  business: string | null
  category: string | null
  status: LeadStatus
  requirement: string | null
  source: LeadSource
  is_eligible: boolean
  opted_out: boolean
  last_contacted_at: string | null
  last_replied_at: string | null
  created_at: string
  updated_at: string
  ai_score?: AIScoreResult | null
}

export interface LeadUpdateInput {
  name?: string
  phone?: string
  business?: string | null
  category?: string | null
  status?: LeadStatus
  requirement?: string | null
  is_eligible?: boolean
  opted_out?: boolean
}

export interface AuditLog {
  id: string
  lead_id: string | null
  action: string
  details: Record<string, unknown> | string | null
  actor: string | null
  created_at: string
}

export type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'draft' | 'active' | 'paused' | 'completed'

export interface CampaignMetadata {
  filter_category?: string | null
  filter_status?: string | null
  rate_per_minute?: number
  target_count?: number
  sent_count?: number
  delivered_count?: number
  failed_count?: number
  read_count?: number
  replied_count?: number
  template?: string | null
}

export interface Campaign {
  id: string
  name: string
  description?: string | null
  status: CampaignStatus
  message_template?: string | null
  filter_category?: string | null
  filter_status?: string | null
  rate_per_minute?: number
  target_count?: number
  sent_count?: number
  delivered_count?: number
  failed_count?: number
  read_count?: number
  replied_count?: number
  started_at?: string | null
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface CampaignLeadPreview {
  lead: Lead
  generatedMessage: string
  status: 'pending' | 'sent' | 'failed' | 'blocked_opted_out' | 'blocked_test_mode'
  wamid?: string | null
  error?: string | null
}

export type FollowUpStatus = 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED'

export interface FollowUp {
  id: string
  lead_id: string
  conversation_id?: string | null
  scheduled_at: string
  status: FollowUpStatus
  message_text?: string | null
  attempt_count: number
  sent_at?: string | null
  created_at: string
  updated_at: string
  lead?: Lead | null
}

export type ConversationIntent =
  | 'PRICING'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'REQUEST_CALLBACK'
  | 'REQUEST_DEMO'
  | 'NEED_MORE_INFORMATION'
  | 'POSITIVE'
  | 'NEGATIVE'
  | 'OTHER'

export interface ConversationAIAnalysis {
  id?: string
  conversation_id: string
  lead_id: string
  intent: ConversationIntent
  temperature: 'HOT' | 'WARM' | 'COLD'
  confidence: number
  reasoning: string
  recommended_action: string
  suggested_reply: string
  requires_human_intervention: boolean
  should_continue_followup: boolean
  created_at?: string
}

export interface Conversation {
  id: string
  lead_id: string
  status: 'ACTIVE' | 'WAITING' | 'CLOSED'
  channel: 'whatsapp'
  last_message_at: string | null
  created_at: string
  updated_at: string
  lead?: Lead
  messages?: Message[]
  ai_analysis?: ConversationAIAnalysis | null
}

export interface Message {
  id: string
  conversation_id: string
  lead_id: string
  direction: 'INBOUND' | 'OUTBOUND'
  sender_type: 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM' | 'LEAD'
  message_text: string
  provider?: string
  provider_message_id?: string | null
  delivery_status?: string | null
  created_at: string
}

export interface AutomationStatus {
  testMode: boolean
  testPhoneNumber: string
  whatsappConfigured: boolean
  n8nConfigured: boolean
  geminiConfigured: boolean
  activeConversationsCount: number
  totalWebhookEventsCount: number
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  conversationId?: string
  deliveryStatus: string
  isTestMode: boolean
  destinationPhone: string
  error?: string | null
}

export interface LeadFilters {
  search?: string
  status?: LeadStatus | 'ALL'
  category?: string
  page?: number
  pageSize?: number
}

export interface DashboardStats {
  totalLeads: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  contactedLeads: number
  interestedLeads: number
  notInterestedLeads: number
  convertedLeads: number
  activeConversations: number
  pendingFollowUps: number
  // AI Metrics
  totalScored?: number
  averageScore?: number
  aiHotCount?: number
  aiWarmCount?: number
  aiColdCount?: number
}

export interface ColumnMappingInfo {
  nameHeader: string | null
  phoneHeader: string | null
  businessHeader: string | null
  categoryHeader: string | null
  nameFallbackFromBusiness: boolean
  extraColumns: string[]
}

export interface ParsedRow {
  _rowIndex: number
  name: string
  phone: string
  business?: string
  category?: string
  requirement?: string
  extra_data?: Record<string, string>
  [key: string]: unknown
}

export interface ValidatedRow extends ParsedRow {
  validationStatus: 'valid' | 'duplicate_file' | 'duplicate_db' | 'invalid'
  errors: string[]
}

export interface ImportPreviewData {
  total: number
  valid: ValidatedRow[]
  duplicatesInFile: ValidatedRow[]
  duplicatesInDb: ValidatedRow[]
  invalid: ValidatedRow[]
  columnMapping?: ColumnMappingInfo
}

export interface ImportResult {
  imported: number
  failed: number
  errors: string[]
}
