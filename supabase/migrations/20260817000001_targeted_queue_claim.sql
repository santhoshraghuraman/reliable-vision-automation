-- ============================================================================
-- Add Targeted Queue Claim Function
-- Used for testing single specific leads safely without relying on schedule order.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_targeted_campaign_lead(p_target_id UUID)
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
    WHERE cl.id = p_target_id
      AND cl.status = 'pending'
      AND cl.scheduled_at <= NOW()
      AND c.status = 'running'
      AND l.status != 'lost'
      AND l.opted_out = false
      AND l.eligible_for_outreach = true
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Secure the function: Only the queue processor (service_role) may execute it
REVOKE EXECUTE ON FUNCTION public.claim_targeted_campaign_lead(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_targeted_campaign_lead(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_targeted_campaign_lead(UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.claim_targeted_campaign_lead(UUID) TO service_role;
