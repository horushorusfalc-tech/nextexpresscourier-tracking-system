-- ============================================
-- Restrict anonymous access: one shipment by tracking number only
-- Run this after 001_initial_schema.sql (e.g. in Supabase SQL Editor)
-- ============================================

-- Function: return one shipment + its tracking_events by tracking number (case-insensitive).
-- SECURITY DEFINER so it runs with definer rights and can read shipments + tracking_events.
CREATE OR REPLACE FUNCTION public.get_shipment_by_tracking_public(p_tracking_number text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', s.id,
    'tracking_number', s.tracking_number,
    'sender_name', s.sender_name,
    'sender_address', s.sender_address,
    'recipient_name', s.recipient_name,
    'recipient_email', s.recipient_email,
    'recipient_address', s.recipient_address,
    'origin', s.origin,
    'destination', s.destination,
    'current_status', s.current_status,
    'estimated_delivery', s.estimated_delivery,
    'weight', s.weight,
    'dimensions', s.dimensions,
    'service_type', s.service_type,
    'content_description', s.content_description,
    'declared_value', s.declared_value,
    'packaging_type', s.packaging_type,
    'cancellation_reason', s.cancellation_reason,
    'created_at', s.created_at,
    'tracking_events', COALESCE(
      (SELECT jsonb_agg(te ORDER BY te.timestamp DESC)
       FROM public.tracking_events te
       WHERE te.shipment_id = s.id),
      '[]'::jsonb
    )
  )
  FROM public.shipments s
  WHERE upper(trim(s.tracking_number)) = upper(trim(p_tracking_number))
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_shipment_by_tracking_public(text) IS
  'Public lookup: one shipment + events by tracking number. Used by anon for Track page.';

-- Revoke anon from selecting all rows; allow only this function.
DROP POLICY IF EXISTS "shipments_anon_select" ON public.shipments;
CREATE POLICY "shipments_anon_select" ON public.shipments
  FOR SELECT TO anon
  USING (false);  -- anon cannot list; they use get_shipment_by_tracking_public()

-- Allow anon to execute the function.
GRANT EXECUTE ON FUNCTION public.get_shipment_by_tracking_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shipment_by_tracking_public(text) TO authenticated;
