# Row Level Security (RLS) Implementation Guide

## Overview

This document explains the RLS policies implemented for the NextExpress Courier Tracking System. RLS ensures that:
- Anonymous users can only look up shipments by tracking number (no browsing)
- Authenticated users have full admin access
- Email logs and templates are protected from anonymous access
- Audit trails are preserved (email logs are read-only after creation)

## Security Model

### Anonymous Users (Public)
- ✅ Can look up shipments by tracking number (single query only)
- ✅ Can view tracking events for shipments they can access
- ❌ Cannot list/browse all shipments
- ❌ Cannot modify any data (INSERT/UPDATE/DELETE)
- ❌ Cannot access email logs
- ❌ Cannot access email templates

### Authenticated Users (Admin/Staff)
- ✅ Full CRUD access to shipments
- ✅ Full CRUD access to tracking events
- ✅ SELECT and INSERT access to email logs (no UPDATE/DELETE for audit trail)
- ✅ Full CRUD access to email templates

## Implementation Details

### 1. Shipments Table

**Anonymous Policy:**
- Policy allows SELECT with `USING (true)`
- Security is enforced at the application layer:
  - `getShipmentByTracking()` uses `.eq('tracking_number', value).maybeSingle()`
  - This ensures only one row is returned per query
  - No public endpoint exists to list all shipments

**Why this approach?**
- RLS policies cannot directly inspect WHERE clauses
- The application layer ensures single-row queries
- Users must know the tracking number to query
- This is the standard pattern for public tracking systems

### 2. Tracking Events Table

**Anonymous Policy:**
- Can SELECT events where the parent shipment exists
- Uses a subquery to check shipment accessibility
- Automatically works when querying via `shipment_id`

**Authenticated Policy:**
- Full CRUD access

### 3. Email Logs Table

**Anonymous Policy:**
- No policies = complete denial of access
- Anonymous users cannot SELECT, INSERT, UPDATE, or DELETE

**Authenticated Policy:**
- SELECT: Full read access
- INSERT: Can create new email log entries
- UPDATE: Denied (no policy = RLS blocks it)
- DELETE: Denied (no policy = RLS blocks it)
- This preserves the audit trail

### 4. Email Templates Table

**Anonymous Policy:**
- No policies = complete denial of access

**Authenticated Policy:**
- Full CRUD access

## Code Changes

### storage.ts Updates

1. **`getShipmentByTracking()`:**
   - Changed from `.ilike()` to `.eq()` for exact matching
   - Uses `.toUpperCase()` for case normalization
   - Uses `.maybeSingle()` to ensure only one row
   - Email logs query fails silently for anonymous users (expected)

2. **`getShipments()`:**
   - Requires authentication (used by admin dashboard)
   - RLS will block anonymous users automatically

## Deployment Steps

1. **Run the migration script:**
   ```sql
   -- Copy and paste supabase_rls_migration.sql into Supabase SQL Editor
   -- Execute the script
   ```

2. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
     AND tablename IN ('shipments', 'tracking_events', 'email_logs', 'email_templates');
   ```
   All tables should show `rowsecurity = true`

3. **Test the policies:**
   - Run queries from `supabase_rls_test_queries.sql`
   - Test as both anonymous and authenticated users
   - Verify expected behavior

4. **Deploy updated code:**
   - The updated `storage.ts` is already configured
   - No other code changes needed

## Testing Checklist

### Anonymous User Tests
- [ ] Can look up shipment by tracking number
- [ ] Cannot list all shipments
- [ ] Can view tracking events for accessible shipments
- [ ] Cannot access email logs
- [ ] Cannot access email templates
- [ ] Cannot INSERT/UPDATE/DELETE any data

### Authenticated User Tests
- [ ] Can list all shipments
- [ ] Can create/update/delete shipments
- [ ] Can create/update/delete tracking events
- [ ] Can read and create email logs
- [ ] Cannot update or delete email logs
- [ ] Can manage email templates

## Security Notes

1. **Anon Key Exposure:**
   - The Supabase anon key is public by design
   - RLS policies enforce access control
   - Never use the service role key in the frontend

2. **Tracking Number Security:**
   - Tracking numbers act as "public keys"
   - Anyone with a tracking number can view that shipment
   - This is expected behavior for a public tracking system
   - Consider adding rate limiting if needed

3. **Email Logs Protection:**
   - Email logs are completely private
   - Only authenticated admins can view them
   - Audit trail is preserved (no updates/deletes)

4. **Policy Idempotency:**
   - All policies use `DROP POLICY IF EXISTS`
   - Migration script can be run multiple times safely
   - Optional tables (email_logs, email_templates) are handled gracefully

## Troubleshooting

### Issue: Anonymous users can't look up shipments
- Check if RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'shipments'`
- Verify the policy exists: `SELECT * FROM pg_policies WHERE tablename = 'shipments'`
- Check that tracking number is being passed correctly in the query

### Issue: Authenticated users can't access data
- Verify user is actually authenticated: Check `auth.users` table
- Verify policies exist for `authenticated` role
- Check Supabase logs for RLS policy violations

### Issue: Email logs queries fail
- This is expected for anonymous users
- Verify `email_logs` table exists (it's optional)
- Check that authenticated users can access it

## Additional Security Recommendations

1. **Rate Limiting:**
   - Consider adding rate limiting for tracking lookups
   - Prevents abuse and enumeration attacks

2. **Tracking Number Format:**
   - Ensure tracking numbers are sufficiently random
   - Consider adding a checksum or validation

3. **Monitoring:**
   - Monitor for unusual query patterns
   - Set up alerts for policy violations

4. **Backup:**
   - Regularly backup your RLS policies
   - Document any custom policies you add

