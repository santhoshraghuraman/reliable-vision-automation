-- ==============================================================================
-- RELIABLE VISION | WEB STUDIO — STAGE 3: INTEGRATIONS SCHEMA MIGRATION
-- Adds missing columns & tables for WhatsApp, Gemini AI, and Follow-up automation.
-- Idempotent: safe to run multiple times in Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. IMPORT_BATCHES TABLE (Excel dataset tracking)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    total_rows INT DEFAULT 0,
    valid_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for import_batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Import batches select policy" ON public.import_batches;
DROP POLICY IF EXISTS "Import batches insert policy" ON public.import_batches;
DROP POLICY IF EXISTS "Import batches delete policy" ON public.import_batches;
CREATE POLICY "Import batches select policy" ON public.import_batches FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Import batches insert policy" ON public.import_batches FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Import batches delete policy" ON public.import_batches FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. ADD MISSING COLUMNS TO public.leads
-- ------------------------------------------------------------------------------
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS import_batch_name TEXT;

-- Index for city and batch lookups
CREATE INDEX IF NOT EXISTS idx_leads_city ON public.leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_import_batch_id ON public.leads(import_batch_id);

-- ------------------------------------------------------------------------------
-- 3. ADD MISSING COLUMNS TO public.business_settings
-- ------------------------------------------------------------------------------
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS max_followups INT DEFAULT 3;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS followup_interval_hours INT DEFAULT 24;

-- ------------------------------------------------------------------------------
-- 4. ADD MISSING COLUMNS TO public.messages
-- ------------------------------------------------------------------------------
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;

-- Unique constraint on external_message_id to prevent duplicate webhook processing
-- (external_message_id is the wamid from Meta)
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_message_id
    ON public.messages(external_message_id)
    WHERE external_message_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. ADD MISSING COLUMNS TO public.followups
-- ------------------------------------------------------------------------------
ALTER TABLE public.followups ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.followups ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
-- (sent_at may already exist from stage2, this is idempotent)

-- ------------------------------------------------------------------------------
-- 6. ADD MISSING COLUMNS TO public.conversations
-- ------------------------------------------------------------------------------
-- Track whether human takeover is active
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------------------------
-- 7. AI_LOGS - add structured columns if missing
-- ------------------------------------------------------------------------------
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS should_reply BOOLEAN DEFAULT FALSE;
ALTER TABLE public.ai_logs ADD COLUMN IF NOT EXISTS reply_sent TEXT;

-- ------------------------------------------------------------------------------
-- 8. SERVICE ROLE BYPASS POLICY for webhook processing
-- The webhook route runs server-side with service_role key and needs to insert
-- messages without an authenticated session from the lead.
-- We create a separate permissive policy for service_role.
-- ------------------------------------------------------------------------------
-- Note: service_role already bypasses RLS by default in Supabase.
-- No extra policy needed — just ensure service_role key is used server-side.

-- ==============================================================================
-- VERIFICATION QUERY (run this to confirm all columns exist)
-- ==============================================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'business_settings' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_batches';
