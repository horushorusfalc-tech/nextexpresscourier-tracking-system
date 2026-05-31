-- ============================================
-- Add Blockchain Transaction Verification
-- ============================================
-- Adds support for storing and tracking blockchain
-- transaction hashes for automated payment verification

-- Add transaction_hash column to payment_logs
ALTER TABLE public.payment_logs 
ADD COLUMN IF NOT EXISTS transaction_hash text,
ADD COLUMN IF NOT EXISTS blockchain_verified_at timestamptz;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_payment_logs_tx_hash ON public.payment_logs (transaction_hash);
CREATE INDEX IF NOT EXISTS idx_payment_logs_verified_at ON public.payment_logs (blockchain_verified_at);

-- Example usage:
-- INSERT INTO payment_logs (shipment_id, amount, status, transaction_hash, blockchain_verified_at)
-- VALUES (shipment_uuid, 50.00, 'verified', '0x123abc...', now());
