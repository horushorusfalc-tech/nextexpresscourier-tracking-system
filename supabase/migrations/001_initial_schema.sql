-- ============================================
-- NextExpress Courier – New Supabase Project
-- Full schema: tables, indexes, RLS
-- Run this once in Supabase SQL Editor (new project)
-- ============================================

-- Enable UUID extension (usually already on)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. SHIPMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_number text NOT NULL UNIQUE,
  sender_name text NOT NULL,
  sender_address text NOT NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  recipient_address text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  current_status text NOT NULL DEFAULT 'Pending',
  estimated_delivery text,
  weight text,
  dimensions text,
  service_type text NOT NULL,
  content_description text,
  declared_value text,
  packaging_type text,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments (tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_current_status ON public.shipments (current_status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON public.shipments (created_at DESC);

COMMENT ON TABLE public.shipments IS 'Core shipment records; public lookup by tracking_number only (RLS).';

-- ============================================
-- 2. TRACKING_EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.tracking_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id uuid NOT NULL REFERENCES public.shipments (id) ON DELETE CASCADE,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  location text NOT NULL,
  status text NOT NULL,
  description text,
  is_customs_event boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_shipment_id ON public.tracking_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON public.tracking_events ("timestamp" DESC);

COMMENT ON TABLE public.tracking_events IS 'Status history per shipment; anon can read only for shipments they can see.';

-- ============================================
-- 3. EMAIL_TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_templates IS 'Admin-managed email templates; authenticated only (RLS).';

-- ============================================
-- 4. EMAIL_LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id uuid NOT NULL REFERENCES public.shipments (id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  subject text NOT NULL,
  body text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_shipment_id ON public.email_logs (shipment_id);

COMMENT ON TABLE public.email_logs IS 'Audit log of sent emails; authenticated read, Edge Function insert.';

-- ============================================
-- RLS: SHIPMENTS
-- ============================================
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipments_anon_select" ON public.shipments;
DROP POLICY IF EXISTS "shipments_auth_select" ON public.shipments;
DROP POLICY IF EXISTS "shipments_auth_insert" ON public.shipments;
DROP POLICY IF EXISTS "shipments_auth_update" ON public.shipments;
DROP POLICY IF EXISTS "shipments_auth_delete" ON public.shipments;
CREATE POLICY "shipments_anon_select" ON public.shipments
  FOR SELECT TO anon USING (false);
CREATE POLICY "shipments_auth_select" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "shipments_auth_insert" ON public.shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "shipments_auth_update" ON public.shipments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shipments_auth_delete" ON public.shipments FOR DELETE TO authenticated USING (true);

-- Public lookup for a single shipment by tracking number; anon users may use the RPC function rather than direct table queries.
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
  'Public shipment lookup by tracking number. Allows anon single-record access via RPC.';

GRANT EXECUTE ON FUNCTION public.get_shipment_by_tracking_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shipment_by_tracking_public(text) TO authenticated;

-- ============================================
-- RLS: TRACKING_EVENTS
-- ============================================
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tracking_events_anon_select" ON public.tracking_events;
CREATE POLICY "tracking_events_anon_select" ON public.tracking_events
  FOR SELECT TO anon
  USING (false);

DROP POLICY IF EXISTS "tracking_events_auth_select" ON public.tracking_events;
DROP POLICY IF EXISTS "tracking_events_auth_insert" ON public.tracking_events;
DROP POLICY IF EXISTS "tracking_events_auth_update" ON public.tracking_events;
DROP POLICY IF EXISTS "tracking_events_auth_delete" ON public.tracking_events;
CREATE POLICY "tracking_events_auth_select" ON public.tracking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "tracking_events_auth_insert" ON public.tracking_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tracking_events_auth_update" ON public.tracking_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tracking_events_auth_delete" ON public.tracking_events FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS: EMAIL_TEMPLATES (authenticated only)
-- ============================================
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_templates_auth_select" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_auth_insert" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_auth_update" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_auth_delete" ON public.email_templates;
CREATE POLICY "email_templates_auth_select" ON public.email_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_templates_auth_insert" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "email_templates_auth_update" ON public.email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "email_templates_auth_delete" ON public.email_templates FOR DELETE TO authenticated USING (true);

-- ============================================
-- RLS: EMAIL_LOGS (authenticated read; insert via service role or authenticated)
-- ============================================
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_logs_auth_select" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_auth_insert" ON public.email_logs;
CREATE POLICY "email_logs_auth_select" ON public.email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "email_logs_auth_insert" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- Optional: seed one admin user (create in Dashboard > Authentication > Users first, then set role)
-- Or use Supabase Auth Dashboard to invite/sign up and set user_metadata.role = 'ADMIN'
-- ============================================
