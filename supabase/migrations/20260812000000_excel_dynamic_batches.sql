-- ==============================================================================
-- RELIABLE VISION | WEB STUDIO - IMPORT BATCHES & DYNAMIC EXCEL LEADS SCHEMA
-- ==============================================================================

-- 1. Create import_batches Table
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    total_rows INT DEFAULT 0,
    valid_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add city, import_batch_id, import_batch_name columns to public.leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS import_batch_name TEXT;

-- 3. Enable RLS and Create Policies for import_batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access on import_batches" ON public.import_batches;
CREATE POLICY "Allow full access on import_batches" ON public.import_batches FOR ALL USING (true) WITH CHECK (true);

-- 4. Update Foreign Key constraints to ON DELETE CASCADE for clean dataset removal
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_lead_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_lead_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.followups DROP CONSTRAINT IF EXISTS followups_lead_id_fkey;
ALTER TABLE public.followups ADD CONSTRAINT followups_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
