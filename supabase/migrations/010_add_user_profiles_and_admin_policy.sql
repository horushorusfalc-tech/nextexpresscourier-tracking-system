-- 010_add_user_profiles_and_admin_policy.sql
-- Create a user_profiles table to track admin accounts and update RLS
-- Run this in Supabase SQL editor. This script is safe if run after initial migrations.

-- 1) Create profiles table (id references auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean DEFAULT false,
  full_name text
);

-- 2) Populate an admin entry by email (replace the email below if needed)
-- This finds the auth user by email and inserts/updates the profile as admin.
DO $$
DECLARE
  target_email text := 'talibanxyzz@gmail.com'; -- CHANGE THIS if needed
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.user_profiles (id, is_admin)
    VALUES (uid, true)
    ON CONFLICT (id) DO UPDATE SET is_admin = true;
  ELSE
    RAISE NOTICE 'No auth.user found for % - create the user first or update this script', target_email;
  END IF;
END $$;

-- 3) Harden shipments SELECT: require user_profiles.is_admin = true for authenticated role
-- NOTE: Do this only AFTER you have created at least one admin profile (step 2).
DROP POLICY IF EXISTS "shipments_authenticated_select" ON public.shipments;

CREATE POLICY "shipments_authenticated_select" ON public.shipments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.is_admin = true
    )
  );

-- 4) Keep the public RPC for anonymous single-tracking lookups intact
-- (no changes needed to public.get_shipment_by_tracking_public)

-- ROLLBACK NOTES:
-- To revert the policy change if something goes wrong, run:
-- DROP POLICY IF EXISTS "shipments_authenticated_select" ON public.shipments;
-- CREATE POLICY "shipments_authenticated_select" ON public.shipments
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- To remove the user_profiles table (if desired):
-- DROP TABLE IF EXISTS public.user_profiles;
