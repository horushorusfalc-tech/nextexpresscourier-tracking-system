-- ============================================
-- QUICK FIX: Settings Table RLS Policies
-- ============================================
-- Run this in your Supabase SQL Editor to fix the RLS policy error
-- This allows authenticated admins to INSERT and UPDATE settings

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "settings_auth_select" ON public.settings;
DROP POLICY IF EXISTS "settings_admin_update" ON public.settings;
DROP POLICY IF EXISTS "settings_auth_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_auth_update" ON public.settings;

-- Ensure RLS is enabled
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create new policies: SELECT for all authenticated users
CREATE POLICY "settings_auth_select" ON public.settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create new policies: INSERT for authenticated users
CREATE POLICY "settings_auth_insert" ON public.settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create new policies: UPDATE for authenticated users
CREATE POLICY "settings_auth_update" ON public.settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Verify the policies are in place
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'settings'
ORDER BY policyname;
