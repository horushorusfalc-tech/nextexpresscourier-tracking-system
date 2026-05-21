-- ============================================
-- NextExpress Courier Tracking System
-- RLS Policy Test Queries
-- ============================================
-- 
-- Run these queries in Supabase SQL Editor to test RLS policies
-- Test both as anonymous (anon key) and authenticated user
-- ============================================

-- ============================================
-- TEST 1: Anonymous User - Shipment Lookup by Tracking Number
-- ============================================
-- Expected: Should return ONLY the shipment with matching tracking number
-- Expected: Should NOT return all shipments

-- Test 1a: Single shipment lookup (should work)
-- Replace 'NEC12345678' with an actual tracking number from your database
SELECT * FROM shipments 
WHERE tracking_number = 'NEC12345678';

-- Test 1b: List all shipments (should FAIL for anonymous)
-- Expected: Should return 0 rows or error
SELECT * FROM shipments;

-- Test 1c: Case-insensitive lookup (should work)
SELECT * FROM shipments 
WHERE tracking_number ILIKE 'nec12345678';

-- ============================================
-- TEST 2: Anonymous User - Tracking Events
-- ============================================
-- Expected: Should return events only for shipments they can access

-- Test 2a: Get events for a specific shipment (should work if shipment is accessible)
-- Replace 'shipment-id-here' with an actual shipment ID
SELECT te.*, s.tracking_number 
FROM tracking_events te
JOIN shipments s ON s.id = te.shipment_id
WHERE s.tracking_number = 'NEC12345678';

-- Test 2b: List all tracking events (should FAIL for anonymous)
-- Expected: Should return 0 rows (because RLS checks shipment access)
SELECT * FROM tracking_events;

-- ============================================
-- TEST 3: Anonymous User - Email Logs
-- ============================================
-- Expected: Should return 0 rows (no anonymous access)

-- Test 3a: Try to select email logs (should FAIL)
SELECT * FROM email_logs;

-- Test 3b: Try to insert email log (should FAIL)
-- This should fail with permission denied
-- INSERT INTO email_logs (shipment_id, subject, body, recipient, status)
-- VALUES ('some-id', 'Test', 'Test body', 'test@example.com', 'SENT');

-- ============================================
-- TEST 4: Anonymous User - Email Templates
-- ============================================
-- Expected: Should return 0 rows (no anonymous access)

-- Test 4a: Try to select email templates (should FAIL)
SELECT * FROM email_templates;

-- ============================================
-- TEST 5: Authenticated User - Full Access
-- ============================================
-- Expected: Should have full CRUD access to all tables

-- Test 5a: List all shipments (should work)
SELECT * FROM shipments ORDER BY created_at DESC;

-- Test 5b: List all tracking events (should work)
SELECT * FROM tracking_events ORDER BY timestamp DESC;

-- Test 5c: List all email logs (should work)
SELECT * FROM email_logs ORDER BY sent_at DESC;

-- Test 5d: List all email templates (should work)
SELECT * FROM email_templates ORDER BY created_at DESC;

-- Test 5e: Insert shipment (should work)
-- INSERT INTO shipments (tracking_number, sender_name, recipient_name, ...)
-- VALUES ('NEC99999999', 'Test Sender', 'Test Recipient', ...);

-- Test 5f: Update shipment (should work)
-- UPDATE shipments SET current_status = 'In Transit' WHERE tracking_number = 'NEC99999999';

-- Test 5g: Delete shipment (should work)
-- DELETE FROM shipments WHERE tracking_number = 'NEC99999999';

-- ============================================
-- TEST 6: Authenticated User - Email Logs Restrictions
-- ============================================
-- Expected: Can SELECT and INSERT, but NOT UPDATE or DELETE

-- Test 6a: Select email logs (should work)
SELECT * FROM email_logs WHERE shipment_id = 'some-id';

-- Test 6b: Insert email log (should work)
-- INSERT INTO email_logs (shipment_id, subject, body, recipient, status)
-- VALUES ('some-id', 'Test', 'Test body', 'test@example.com', 'SENT');

-- Test 6c: Update email log (should FAIL)
-- UPDATE email_logs SET status = 'FAILED' WHERE id = 'some-id';
-- Expected: Permission denied error

-- Test 6d: Delete email log (should FAIL)
-- DELETE FROM email_logs WHERE id = 'some-id';
-- Expected: Permission denied error

-- ============================================
-- TEST 7: Integration Test - Public Tracking Flow
-- ============================================
-- This simulates what the frontend does when a user looks up a tracking number

-- Step 1: Get shipment by tracking number (as anonymous)
SELECT s.* 
FROM shipments s
WHERE s.tracking_number = 'NEC12345678';

-- Step 2: Get tracking events for that shipment (as anonymous)
-- This should work because the shipment is accessible
SELECT te.*
FROM tracking_events te
WHERE te.shipment_id = (
  SELECT id FROM shipments WHERE tracking_number = 'NEC12345678'
)
ORDER BY te.timestamp DESC;

-- Step 3: Try to get email logs (as anonymous) - should return nothing
SELECT el.*
FROM email_logs el
WHERE el.shipment_id = (
  SELECT id FROM shipments WHERE tracking_number = 'NEC12345678'
);

-- ============================================
-- TEST 8: Verify Policies Are Active
-- ============================================

-- Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('shipments', 'tracking_events', 'email_logs', 'email_templates');

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('shipments', 'tracking_events', 'email_logs', 'email_templates')
GROUP BY tablename
ORDER BY tablename;

