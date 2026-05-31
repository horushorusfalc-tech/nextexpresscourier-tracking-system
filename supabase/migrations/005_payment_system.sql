-- ============================================
-- Payment System for Customs Charges
-- ============================================

-- ============================================
-- 1. ALTER SHIPMENTS TABLE
-- ============================================
ALTER TABLE public.shipments
ADD COLUMN IF NOT EXISTS customs_charge decimal(10, 2),
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'verified', 'failed')),
ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_notes text;

CREATE INDEX IF NOT EXISTS idx_shipments_payment_status ON public.shipments (payment_status);

-- ============================================
-- 2. SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings (key);

-- Insert default wallet settings (admin will update these)
INSERT INTO public.settings (key, value, description) 
VALUES 
  ('wallet_address', '', 'Primary Bitcoin/Crypto wallet address for receiving customs charges'),
  ('wallet_address_secondary', '', 'Optional secondary wallet address'),
  ('payment_instructions', 'Please send payment to the wallet address below. Include your tracking number in payment memo if possible.', 'Custom payment instructions for customers'),
  ('auto_notify_admin_on_payment_claim', 'true', 'Send email to admin when customer claims payment made'),
  ('auto_advance_on_payment', 'true', 'Automatically advance shipment to next status when payment verified')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 3. PAYMENT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id uuid NOT NULL REFERENCES public.shipments (id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  status text NOT NULL CHECK (status IN ('claimed', 'verified', 'failed')),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  verified_by_user_id text,
  notes text,
  transaction_hash text
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_shipment_id ON public.payment_logs (shipment_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON public.payment_logs (status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_claimed_at ON public.payment_logs (claimed_at DESC);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Settings table - Authenticated users can read, insert, and update
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_auth_select" ON public.settings;
DROP POLICY IF EXISTS "settings_auth_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_auth_update" ON public.settings;
DROP POLICY IF EXISTS "settings_admin_update" ON public.settings;

CREATE POLICY "settings_auth_select" ON public.settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "settings_auth_insert" ON public.settings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "settings_auth_update" ON public.settings
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Payment logs - Authenticated users can read all, edge functions can insert
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_logs_auth_select" ON public.payment_logs;
DROP POLICY IF EXISTS "payment_logs_insert" ON public.payment_logs;

CREATE POLICY "payment_logs_auth_select" ON public.payment_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "payment_logs_insert" ON public.payment_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Update shipments RLS to allow payment status updates
DROP POLICY IF EXISTS "shipments_auth_update" ON public.shipments;

CREATE POLICY "shipments_auth_update" ON public.shipments
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.settings IS 'System-wide settings including wallet addresses and payment configurations.';
COMMENT ON TABLE public.payment_logs IS 'Audit trail of payment claims and verifications.';
