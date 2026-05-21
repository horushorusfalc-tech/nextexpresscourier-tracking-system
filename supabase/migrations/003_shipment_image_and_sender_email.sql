-- ============================================
-- Shipment image URL + sender email (for notifications)
-- Run after 002. Creates columns and updates the public tracking function.
-- ============================================

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sender_email text;

COMMENT ON COLUMN public.shipments.image_url IS 'Public URL of shipment photo (Supabase Storage).';
COMMENT ON COLUMN public.shipments.sender_email IS 'Optional sender email for registration notifications.';

-- Update public lookup function to include image_url
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
    'sender_email', s.sender_email,
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
    'image_url', s.image_url,
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
