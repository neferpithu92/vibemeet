-- ============================================================
-- 007: Subscription System Upgrades
-- Billing cycles, billing history, cancellation metadata
-- ============================================================

-- Billing cycle (default 31 days for vibemeet)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  billing_cycle_days INTEGER DEFAULT 31;

-- Cancellation metadata
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS
  cancellation_reason TEXT;

-- Billing History table
CREATE TABLE IF NOT EXISTS billing_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  entity_id       UUID NOT NULL,
  entity_type     TEXT NOT NULL, -- venue | artist
  amount          DECIMAL(10,2) NOT NULL,
  currency        TEXT DEFAULT 'CHF',
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  stripe_invoice_id TEXT,
  status          TEXT DEFAULT 'paid', -- paid | failed | refunded | pending
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_history_sub ON billing_history(subscription_id);
CREATE INDEX idx_billing_history_entity ON billing_history(entity_id, entity_type);

-- RLS
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY billing_history_select ON billing_history FOR SELECT USING (
  auth.uid() = entity_id OR
  auth.uid() IN (SELECT owner_id FROM venues WHERE id = entity_id)
);
