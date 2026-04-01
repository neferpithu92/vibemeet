-- 044: Payment Splits & Commission
-- Adds infrastructure for 3% platform commission and direct venue payouts (Stripe Connect style).

-- 1. Venue Payout Configuration
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
ADD COLUMN IF NOT EXISTS charging_enabled BOOLEAN DEFAULT FALSE;

-- 2. Payment Table Enhancement
-- Track platform fees and destination accounts
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS destination_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2) DEFAULT 3.00,
ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'pending'; -- pending | paid_to_merchant | failed

-- 3. Secure Ticket Signatures
-- Stores the signature for QR verification to prevent forgery
ALTER TABLE ticket_instances
ADD COLUMN IF NOT EXISTS signature TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ DEFAULT NOW();

-- 4. RLS update: Only admins can view sensitive fee info across all payments
CREATE POLICY "Admins can view all payment fees" 
ON payments FOR SELECT 
USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 5. Trigger: Auto-calculate 3% fee on payment insert
CREATE OR REPLACE FUNCTION calculate_platform_fees()
RETURNS TRIGGER AS $$
BEGIN
  -- 3% Commission Logic
  NEW.platform_fee_amount := NEW.amount * 0.03;
  NEW.destination_amount := NEW.amount - NEW.platform_fee_amount;
  NEW.platform_fee_percentage := 3.00;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calculate_fees
BEFORE INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION calculate_platform_fees();
