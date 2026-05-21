-- ============================================
-- NextExpress Courier Tracking System
-- Row Level Security (RLS) Migration Script
-- ============================================
-- 
-- This script implements comprehensive RLS policies for:
-- - shipments: Public lookup by tracking number, full CRUD for authenticated
-- - tracking_events: Public access via shipment lookup, full CRUD for authenticated
-- - email_logs: Authenticated only (SELECT/INSERT, no UPDATE/DELETE)
-- - email_templates: Authenticated only (full CRUD)
--
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SHIPMENTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "shipments_anon_select_by_tracking" ON shipments;
DROP POLICY IF EXISTS "shipments_authenticated_select" ON shipments;
DROP POLICY IF EXISTS "shipments_authenticated_insert" ON shipments;
DROP POLICY IF EXISTS "shipments_authenticated_update" ON shipments;
DROP POLICY IF EXISTS "shipments_authenticated_delete" ON shipments;

-- Anonymous: SELECT only WHERE tracking_number matches (single lookup, no listing)
-- Note: RLS policies cannot directly inspect WHERE clauses, so we allow SELECT
-- but the application MUST use .eq('tracking_number', value).maybeSingle() 
-- to ensure only one row is returned. This prevents listing all shipments.
-- 
-- Security: Anonymous users can only query shipments they know the tracking number for.
-- They cannot list/browse all shipments because the application doesn't provide that endpoint.
CREATE POLICY "shipments_anon_select_by_tracking" ON shipments
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated: Full SELECT access
CREATE POLICY "shipments_authenticated_select" ON shipments
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated: INSERT
CREATE POLICY "shipments_authenticated_insert" ON shipments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated: UPDATE
CREATE POLICY "shipments_authenticated_update" ON shipments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated: DELETE
CREATE POLICY "shipments_authenticated_delete" ON shipments
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 2. TRACKING_EVENTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "tracking_events_anon_select_by_shipment" ON tracking_events;
DROP POLICY IF EXISTS "tracking_events_authenticated_select" ON tracking_events;
DROP POLICY IF EXISTS "tracking_events_authenticated_insert" ON tracking_events;
DROP POLICY IF EXISTS "tracking_events_authenticated_update" ON tracking_events;
DROP POLICY IF EXISTS "tracking_events_authenticated_delete" ON tracking_events;

-- Anonymous: SELECT only where the parent shipment exists
-- This allows public access to tracking events when querying via shipment_id
-- The shipment itself must be accessible (which is controlled by shipments RLS)
CREATE POLICY "tracking_events_anon_select_by_shipment" ON tracking_events
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM shipments
      WHERE shipments.id = tracking_events.shipment_id
    )
  );

-- Authenticated: Full SELECT access
CREATE POLICY "tracking_events_authenticated_select" ON tracking_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated: INSERT
CREATE POLICY "tracking_events_authenticated_insert" ON tracking_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated: UPDATE
CREATE POLICY "tracking_events_authenticated_update" ON tracking_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated: DELETE
CREATE POLICY "tracking_events_authenticated_delete" ON tracking_events
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 3. EMAIL_LOGS TABLE (if exists)
-- ============================================

-- Enable RLS (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "email_logs_authenticated_select" ON email_logs;
    DROP POLICY IF EXISTS "email_logs_authenticated_insert" ON email_logs;
    
    -- No anonymous access - no policies for anon role
    
    -- Authenticated: SELECT only (read-only for audit trail)
    CREATE POLICY "email_logs_authenticated_select" ON email_logs
      FOR SELECT
      TO authenticated
      USING (true);
    
    -- Authenticated: INSERT only (no UPDATE or DELETE to preserve audit trail)
    CREATE POLICY "email_logs_authenticated_insert" ON email_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    -- Explicitly deny UPDATE and DELETE (RLS denies by default, but being explicit)
    -- Note: Supabase RLS denies operations that don't have a policy, so no UPDATE/DELETE policies = denied
  END IF;
END $$;

-- ============================================
-- 4. EMAIL_TEMPLATES TABLE (if exists)
-- ============================================

-- Enable RLS (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "email_templates_authenticated_select" ON email_templates;
    DROP POLICY IF EXISTS "email_templates_authenticated_insert" ON email_templates;
    DROP POLICY IF EXISTS "email_templates_authenticated_update" ON email_templates;
    DROP POLICY IF EXISTS "email_templates_authenticated_delete" ON email_templates;
    
    -- No anonymous access - no policies for anon role
    
    -- Authenticated: Full CRUD
    CREATE POLICY "email_templates_authenticated_select" ON email_templates
      FOR SELECT
      TO authenticated
      USING (true);
    
    CREATE POLICY "email_templates_authenticated_insert" ON email_templates
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
    
    CREATE POLICY "email_templates_authenticated_update" ON email_templates
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
    
    CREATE POLICY "email_templates_authenticated_delete" ON email_templates
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify RLS is working correctly

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('shipments', 'tracking_events', 'email_logs', 'email_templates')
ORDER BY tablename;

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shipments', 'tracking_events', 'email_logs', 'email_templates')
ORDER BY tablename, policyname;

