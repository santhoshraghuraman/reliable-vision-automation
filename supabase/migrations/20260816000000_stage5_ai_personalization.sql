-- Add missing fields to campaigns table based on UI requirements
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS message_template TEXT,
ADD COLUMN IF NOT EXISTS total_leads INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- Add personalization tracking to campaign_leads table
ALTER TABLE public.campaign_leads
ADD COLUMN IF NOT EXISTS personalized_message TEXT,
ADD COLUMN IF NOT EXISTS personalization_status TEXT CHECK (personalization_status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS personalization_error TEXT;

-- Index to optimize querying leads that need personalization
CREATE INDEX IF NOT EXISTS idx_campaign_leads_personalization ON public.campaign_leads(personalization_status) WHERE personalization_status = 'pending';
