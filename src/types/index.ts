export type LeadTemperature = 'hot' | 'warm' | 'cold';

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'qualified' | 'converted' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  business: string;
  category: string;
  status: LeadStatus;
  temperature: LeadTemperature;
  lastMessageAt?: string;
  lastReplyAt?: string;
  nextFollowupAt?: string;
  createdAt: string;
  updatedAt: string;
  city?: string;
  notes?: string;
}

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  targetAudience: string;
  totalTarget: number;
  contacted: number;
  replied: number;
  hotLeads: number;
  startTime: string;
  endTime?: string;
  messageTemplate: string;
  createdAt: string;
}

export interface Message {
  id: string;
  leadId: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  message: string;
  whatsappMessageId?: string;
  createdAt: string;
  isAiGenerated?: boolean;
  intent?: string;
}

export interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadBusiness: string;
  category: string;
  temperature: LeadTemperature;
  status: 'active' | 'archived' | 'human_handoff';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  needsHuman?: boolean;
}

export type FollowUpStatus = 'pending' | 'sent' | 'cancelled' | 'overdue';

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadBusiness: string;
  scheduledAt: string;
  followupNumber: number;
  status: FollowUpStatus;
  messageTemplate: string;
  temperature: LeadTemperature;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  description: string;
  services: string[];
  serviceArea: string;
  website: string;
  email: string;
  whatsappNumber: string;
  aiInstructions: string;
  autoReplyEnabled: boolean;
  maxFollowups: number;
  followupIntervalHours: number;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
  iconName?: string;
}
