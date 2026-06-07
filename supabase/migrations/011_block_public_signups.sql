-- 011_block_public_signups.sql
-- Prevent new public signups by rejecting inserts into auth.users unless the email is allowlisted.
-- WARNING: This will block all new signups except addresses listed in public.allowed_signups.
-- Run in Supabase SQL editor. Ensure your admin user exists before applying.

-- 1) Create allowlist table
CREATE TABLE IF NOT EXISTS public.allowed_signups (
  email text PRIMARY KEY
);

-- 2) Populate allowlist with the admin email
INSERT INTO public.allowed_signups (email)
VALUES ('talibanxyzz@gmail.com')
ON CONFLICT DO NOTHING;

-- 3) Create trigger function to block non-allowlisted signups
CREATE OR REPLACE FUNCTION public.block_non_allowed_signups()
RETURNS trigger AS $$
BEGIN
  -- If email is not in allowlist, reject the insert
  IF NOT EXISTS (SELECT 1 FROM public.allowed_signups a WHERE lower(a.email) = lower(NEW.email)) THEN
    RAISE EXCEPTION 'Signups are disabled on this project';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) Attach trigger to auth.users BEFORE INSERT
DROP TRIGGER IF EXISTS prevent_public_signups ON auth.users;
CREATE TRIGGER prevent_public_signups
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.block_non_allowed_signups();

-- ROLLBACK notes:
-- To remove the block and allow signups again, run:
-- DROP TRIGGER IF EXISTS prevent_public_signups ON auth.users;
-- DROP FUNCTION IF EXISTS public.block_non_allowed_signups();
-- DROP TABLE IF EXISTS public.allowed_signups;
