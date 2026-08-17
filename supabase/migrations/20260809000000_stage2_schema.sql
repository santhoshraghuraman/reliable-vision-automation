-- ==============================================================================
-- RELIABLE VISION | WEB STUDIO - STAGE 2 SUPABASE DATABASE MIGRATION
-- Production-ready PostgreSQL Schema with Strict Role-Based RLS & Search-Path Hardening
-- Idempotent script: Safe to execute repeatedly in Supabase SQL Editor
-- ==============================================================================

-- Enable UUID Extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (References auth.users)
-- Default role is strictly 'user' (NOT admin) to prevent public signup privilege escalation.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function to automatically create a profile when a new user signs up in Supabase Auth.
-- SECURITY DEFINER with explicit search_path = public, pg_catalog, pg_temp to allow safe execution.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role TEXT := 'user';
BEGIN
    -- Automatically assign 'admin' ONLY to authorized business admin email addresses
    IF lower(NEW.email) IN ('santhosh.rv.work@gmail.com', 'santhosh.r2022b@vitstudent.ac.in', 'admin@reliablevision.in') THEN
        assigned_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        coalesce(NEW.raw_user_meta_data->>'full_name', 'User'),
        assigned_role
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to PREVENT ROLE SELF-ESCALATION
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role <> OLD.role AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Security Policy Violation: Only an existing admin can modify profile roles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, pg_temp;

DROP TRIGGER IF EXISTS check_role_escalation ON public.profiles;
CREATE TRIGGER check_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- ------------------------------------------------------------------------------
-- 2. BUSINESS SETTINGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    description TEXT,
    services TEXT[] DEFAULT '{}',
    service_area TEXT,
    website TEXT,
    email TEXT,
    whatsapp_number TEXT,
    ai_instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Business Configuration for Reliable Vision | Web Studio
INSERT INTO public.business_settings (
    business_name,
    description,
    services,
    service_area,
    website,
    email,
    whatsapp_number,
    ai_instructions
) VALUES (
    'Reliable Vision | Web Studio',
    'Professional Website Development Services',
    ARRAY['Business Websites', 'Landing Pages', 'Portfolio Websites', 'Website Redesign'],
    'Tamil Nadu, India',
    'https://santhosh-portfolio-gamma.vercel.app/',
    'santhosh.rv.work@gmail.com',
    '+91 9597482991',
    'You are the friendly and professional AI Assistant for Reliable Vision | Web Studio based in Tamil Nadu, India. Engage respectfully, highlight our web studio portfolio, and classify lead interest into cold, warm, or hot.'
)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. LEADS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE, -- Normalized phone number duplicate protection
    business TEXT NOT NULL,
    category TEXT,
    status TEXT CHECK (status IN ('cold', 'warm', 'hot')) DEFAULT 'cold',
    campaign_status TEXT CHECK (campaign_status IN ('pending', 'contacted', 'replied', 'paused', 'completed', 'failed')) DEFAULT 'pending',
    last_message_at TIMESTAMPTZ,
    last_reply_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. CAMPAIGNS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('draft', 'active', 'paused', 'completed', 'failed')) DEFAULT 'draft',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CAMPAIGN LEADS TABLE (Junction Table with Unique Protection)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_campaign_lead UNIQUE(campaign_id, lead_id)
);

-- ------------------------------------------------------------------------------
-- 6. CONVERSATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT, -- Protect conversation history against accidental cascade deletion
    status TEXT CHECK (status IN ('active', 'closed', 'handoff')) DEFAULT 'active',
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. MESSAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'template', 'system')) DEFAULT 'text',
    external_message_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. FOLLOWUPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    followup_number INT DEFAULT 1,
    status TEXT CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')) DEFAULT 'scheduled',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. AI LOGS TABLE (For AI debugging & auditing)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    input TEXT,
    output TEXT,
    intent TEXT,
    lead_temperature TEXT,
    model TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_status ON public.leads(campaign_status);
CREATE INDEX IF NOT EXISTS idx_leads_category ON public.leads(category);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON public.messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled_at ON public.followups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_followups_status ON public.followups(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON public.campaign_leads(lead_id);

-- ==============================================================================
-- SECURE ROLE-BASED AUTHORIZATION (STRICT ADMIN RLS)
-- Helper Function: Check if current authenticated user has 'admin' role in public.profiles
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog, pg_temp;

-- Enable RLS on all 10 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS POLICIES BY TABLE (IDEMPOTENT CLEANUP & CREATION)
-- ------------------------------------------------------------------------------

-- 1. Profiles
DROP POLICY IF EXISTS "Admin full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles delete policy" ON public.profiles;

CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Profiles insert policy" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "Profiles delete policy" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- 2. Business Settings
DROP POLICY IF EXISTS "Admin full access to business_settings" ON public.business_settings;
DROP POLICY IF EXISTS "Business settings select policy" ON public.business_settings;
DROP POLICY IF EXISTS "Business settings insert policy" ON public.business_settings;
DROP POLICY IF EXISTS "Business settings update policy" ON public.business_settings;
DROP POLICY IF EXISTS "Business settings delete policy" ON public.business_settings;

CREATE POLICY "Business settings select policy" ON public.business_settings FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Business settings insert policy" ON public.business_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Business settings update policy" ON public.business_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Business settings delete policy" ON public.business_settings FOR DELETE TO authenticated USING (public.is_admin());

-- 3. Leads
DROP POLICY IF EXISTS "Admin full access to leads" ON public.leads;
DROP POLICY IF EXISTS "Leads select policy" ON public.leads;
DROP POLICY IF EXISTS "Leads insert policy" ON public.leads;
DROP POLICY IF EXISTS "Leads update policy" ON public.leads;
DROP POLICY IF EXISTS "Leads delete policy" ON public.leads;

CREATE POLICY "Leads select policy" ON public.leads FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Leads insert policy" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Leads update policy" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Leads delete policy" ON public.leads FOR DELETE TO authenticated USING (public.is_admin());

-- 4. Campaigns
DROP POLICY IF EXISTS "Admin full access to campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns select policy" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns insert policy" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns update policy" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns delete policy" ON public.campaigns;

CREATE POLICY "Campaigns select policy" ON public.campaigns FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Campaigns insert policy" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Campaigns update policy" ON public.campaigns FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Campaigns delete policy" ON public.campaigns FOR DELETE TO authenticated USING (public.is_admin());

-- 5. Campaign Leads
DROP POLICY IF EXISTS "Admin full access to campaign_leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Campaign leads select policy" ON public.campaign_leads;
DROP POLICY IF EXISTS "Campaign leads insert policy" ON public.campaign_leads;
DROP POLICY IF EXISTS "Campaign leads update policy" ON public.campaign_leads;
DROP POLICY IF EXISTS "Campaign leads delete policy" ON public.campaign_leads;

CREATE POLICY "Campaign leads select policy" ON public.campaign_leads FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Campaign leads insert policy" ON public.campaign_leads FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Campaign leads update policy" ON public.campaign_leads FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Campaign leads delete policy" ON public.campaign_leads FOR DELETE TO authenticated USING (public.is_admin());

-- 6. Conversations
DROP POLICY IF EXISTS "Admin full access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversations select policy" ON public.conversations;
DROP POLICY IF EXISTS "Conversations insert policy" ON public.conversations;
DROP POLICY IF EXISTS "Conversations update policy" ON public.conversations;
DROP POLICY IF EXISTS "Conversations delete policy" ON public.conversations;

CREATE POLICY "Conversations select policy" ON public.conversations FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Conversations insert policy" ON public.conversations FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Conversations update policy" ON public.conversations FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Conversations delete policy" ON public.conversations FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Messages
DROP POLICY IF EXISTS "Admin full access to messages" ON public.messages;
DROP POLICY IF EXISTS "Messages select policy" ON public.messages;
DROP POLICY IF EXISTS "Messages insert policy" ON public.messages;
DROP POLICY IF EXISTS "Messages update policy" ON public.messages;
DROP POLICY IF EXISTS "Messages delete policy" ON public.messages;

CREATE POLICY "Messages select policy" ON public.messages FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Messages insert policy" ON public.messages FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Messages update policy" ON public.messages FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Messages delete policy" ON public.messages FOR DELETE TO authenticated USING (public.is_admin());

-- 8. Followups
DROP POLICY IF EXISTS "Admin full access to followups" ON public.followups;
DROP POLICY IF EXISTS "Followups select policy" ON public.followups;
DROP POLICY IF EXISTS "Followups insert policy" ON public.followups;
DROP POLICY IF EXISTS "Followups update policy" ON public.followups;
DROP POLICY IF EXISTS "Followups delete policy" ON public.followups;

CREATE POLICY "Followups select policy" ON public.followups FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Followups insert policy" ON public.followups FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Followups update policy" ON public.followups FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Followups delete policy" ON public.followups FOR DELETE TO authenticated USING (public.is_admin());

-- 9. Notifications
DROP POLICY IF EXISTS "Admin full access to notifications" ON public.notifications;
DROP POLICY IF EXISTS "Notifications select policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications insert policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications update policy" ON public.notifications;
DROP POLICY IF EXISTS "Notifications delete policy" ON public.notifications;

CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Notifications insert policy" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Notifications update policy" ON public.notifications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Notifications delete policy" ON public.notifications FOR DELETE TO authenticated USING (public.is_admin());

-- 10. AI Logs
DROP POLICY IF EXISTS "Admin full access to ai_logs" ON public.ai_logs;
DROP POLICY IF EXISTS "AI logs select policy" ON public.ai_logs;
DROP POLICY IF EXISTS "AI logs insert policy" ON public.ai_logs;
DROP POLICY IF EXISTS "AI logs update policy" ON public.ai_logs;
DROP POLICY IF EXISTS "AI logs delete policy" ON public.ai_logs;

CREATE POLICY "AI logs select policy" ON public.ai_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "AI logs insert policy" ON public.ai_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "AI logs update policy" ON public.ai_logs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "AI logs delete policy" ON public.ai_logs FOR DELETE TO authenticated USING (public.is_admin());

-- ==============================================================================
-- AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_catalog, pg_temp;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
DROP TRIGGER IF EXISTS update_business_settings_modtime ON public.business_settings;
DROP TRIGGER IF EXISTS update_leads_modtime ON public.leads;
DROP TRIGGER IF EXISTS update_campaigns_modtime ON public.campaigns;
DROP TRIGGER IF EXISTS update_campaign_leads_modtime ON public.campaign_leads;
DROP TRIGGER IF EXISTS update_conversations_modtime ON public.conversations;
DROP TRIGGER IF EXISTS update_followups_modtime ON public.followups;

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_settings_modtime BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_modtime BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaigns_modtime BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campaign_leads_modtime BEFORE UPDATE ON public.campaign_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_modtime BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_followups_modtime BEFORE UPDATE ON public.followups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
