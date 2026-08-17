-- Add website discovery and verification fields to the leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS website_status TEXT CHECK (website_status IN ('UNKNOWN', 'HAS_WEBSITE', 'NO_WEBSITE', 'ERROR')) DEFAULT 'UNKNOWN',
ADD COLUMN IF NOT EXISTS website_checked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS website_check_error TEXT,
ADD COLUMN IF NOT EXISTS eligible_for_outreach BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS eligibility_reason TEXT;

-- Create an index to speed up filtering for campaign eligibility
CREATE INDEX IF NOT EXISTS idx_leads_website_status ON public.leads(website_status);
CREATE INDEX IF NOT EXISTS idx_leads_eligible_for_outreach ON public.leads(eligible_for_outreach);
