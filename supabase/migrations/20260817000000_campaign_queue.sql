-- Migration: 20260817000000_campaign_queue.sql
-- Description: Add queue fields to campaign_leads and create atomic locking functions
--
-- CANONICAL STATUS VALUES (established by stage2_schema.sql):
--   campaigns.status:      'draft' | 'active' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
--   campaign_leads.status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
--   leads.status:          'cold' | 'warm' | 'hot'
--
-- ROOT CAUSE OF PREVIOUS FAILURE:
--   Supabase auto-created a constraint named "campaign_leads_status_check"
--   from an earlier dashboard or migration operation. That constraint only
--   allowed uppercase 'PENDING' (or a similar set). When this migration tried
--   to UPDATE status = LOWER(status), the existing constraint rejected 'pending'
--   as an invalid value. The entire transaction rolled back — NO data was changed.
--
--   Confirmed post-failure live state (read-only inspection):
--     campaign_leads: 13 rows, ALL status = 'PENDING'  (unchanged — rollback confirmed)
--     campaigns:       2 rows, ALL status = 'COMPLETED' (unchanged — rollback confirmed)
--     New queue columns (attempts, scheduled_at, etc.): DO NOT EXIST (rollback confirmed)
--
-- FIX:
--   Drop ALL existing CHECK constraints on campaign_leads.status AND campaigns.status
--   BEFORE the normalization UPDATE. This is safe because:
--   - We are replacing them with tighter, correct constraints in the same migration.
--   - The constraint name is not known in advance so we use DROP CONSTRAINT IF EXISTS
--     for every known naming pattern Supabase/Postgres may have generated.

-- ============================================================================
-- STEP 1: Drop ALL potentially blocking CHECK constraints on campaign_leads
--         before attempting any status normalization.
--         Supabase auto-names constraints as "<table>_<column>_check".
--         We also drop our own named constraint from any prior partial run.
-- ============================================================================

ALTER TABLE public.campaign_leads
  DROP CONSTRAINT IF EXISTS campaign_leads_status_check;

ALTER TABLE public.campaign_leads
  DROP CONSTRAINT IF EXISTS check_campaign_lead_status;

-- ============================================================================
-- STEP 2: Drop ALL potentially blocking CHECK constraints on campaigns
-- ============================================================================

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaign_status_check;

-- ============================================================================
-- STEP 3: NOW normalize existing uppercase status values to canonical lowercase
--         All blocking constraints are removed — these UPDATEs will succeed.
-- ============================================================================

-- Normalize campaign_leads.status to lowercase
UPDATE public.campaign_leads
SET status = LOWER(status)
WHERE status != LOWER(status);

-- Normalize campaigns.status to lowercase
UPDATE public.campaigns
SET status = LOWER(status)
WHERE status != LOWER(status);

-- ============================================================================
-- STEP 4: Add queue tracking columns to campaign_leads (idempotent)
-- ============================================================================
ALTER TABLE public.campaign_leads
ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS meta_message_id TEXT;

-- ============================================================================
-- STEP 5: Apply strict status constraint to campaign_leads
--         All rows are now 'pending' (lowercase) — constraint will pass.
-- ============================================================================
ALTER TABLE public.campaign_leads
DROP CONSTRAINT IF EXISTS check_campaign_lead_status;

ALTER TABLE public.campaign_leads
ADD CONSTRAINT check_campaign_lead_status
CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'));

-- ============================================================================
-- STEP 6: Apply campaigns status constraint including new 'running' state.
--   'active'  = campaign configured and visible
--   'running' = operator explicitly started the queue processor
-- ============================================================================
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_status_check
CHECK (status IN ('draft', 'active', 'running', 'paused', 'completed', 'failed', 'cancelled'));

-- ============================================================================
-- STEP 7: Create index for queue processor efficiency (idempotent)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaign_leads_queue
  ON public.campaign_leads(status, scheduled_at)
  WHERE status = 'pending';

-- ============================================================================
-- STEP 8: Atomic queue claiming function
--   SECURITY DEFINER: runs as the definer (service_role) regardless of caller.
--   SET search_path = public: prevents search_path injection attacks.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_campaign_lead(p_limit INTEGER)
RETURNS SETOF public.campaign_leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.campaign_leads
  SET status = 'processing', started_at = NOW()
  WHERE id IN (
    SELECT cl.id
    FROM public.campaign_leads cl
    JOIN public.campaigns c ON c.id = cl.campaign_id
    JOIN public.leads l ON l.id = cl.lead_id
    WHERE cl.status = 'pending'
      AND cl.scheduled_at <= NOW()
      AND c.status = 'running'
      AND l.status != 'lost'
      AND l.opted_out = false
      AND l.eligible_for_outreach = true
    ORDER BY cl.scheduled_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- ============================================================================
-- STEP 9: Stale processing recovery function
--   SECURITY DEFINER + SET search_path = public (same rationale as above).
--   WARNING: Recovering stale rows carries a duplicate-send risk if Meta
--   succeeded immediately before the worker crashed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.recover_stale_campaign_leads(p_timeout_minutes INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recovered_count INTEGER;
BEGIN
  WITH stale AS (
    SELECT id FROM public.campaign_leads
    WHERE status = 'processing'
      AND started_at < NOW() - (p_timeout_minutes || ' minutes')::interval
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.campaign_leads cl
  SET status = 'pending',
      attempts = cl.attempts + 1,
      scheduled_at = NOW() + INTERVAL '15 minutes',
      last_error = 'Recovered from stale processing state (worker crash or timeout)'
  FROM stale
  WHERE cl.id = stale.id;

  GET DIAGNOSTICS v_recovered_count = ROW_COUNT;
  RETURN v_recovered_count;
END;
$$;

-- ============================================================================
-- STEP 10: Lock down function execution privileges
--   PostgreSQL grants EXECUTE to PUBLIC by default on new functions.
--   We revoke that and restrict to service_role only.
--   The queue processor uses createServiceRoleClient() (service_role key).
--   anon and authenticated roles (frontend) cannot call these functions.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.claim_campaign_lead(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_campaign_lead(INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_campaign_lead(INTEGER) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_campaign_lead(INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.recover_stale_campaign_leads(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recover_stale_campaign_leads(INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recover_stale_campaign_leads(INTEGER) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.recover_stale_campaign_leads(INTEGER) TO service_role;
