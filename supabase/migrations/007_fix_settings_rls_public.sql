-- ============================================
-- FIX: Allow Anonymous Users to Read Settings
-- ============================================
-- Issue: Public tracking page visitors couldn't see wallet address
-- because settings table RLS blocked anonymous SELECT
--
-- Solution: Add policy allowing anonymous READ of public settings

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "settings_auth_select" ON public.settings;

-- Create new policy: Allow ANYONE (authenticated or anonymous) to READ settings
-- (Wallet address is PUBLIC information, so this is safe)
CREATE POLICY "settings_public_select" ON public.settings
  FOR SELECT
  USING (true);

-- Keep existing authenticated-only policies for INSERT/UPDATE
-- (Only logged-in admins can modify wallet address)
