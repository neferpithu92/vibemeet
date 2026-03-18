-- ============================================================
-- 009: Tickets System
-- Event tickets with QR codes and Stripe payment intents
-- ============================================================

CREATE TABLE IF NOT EXISTS tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_code         TEXT UNIQUE NOT NULL, -- unique QR identifier
  quantity        INTEGER DEFAULT 1,
  unit_price      DECIMAL(10,2) NOT NULL,
  total_price     DECIMAL(10,2) NOT NULL,
  currency        TEXT DEFAULT 'CHF',
  status          TEXT DEFAULT 'pending', -- pending | paid | used | cancelled | refunded
  stripe_payment_intent_id TEXT,
  checked_in_at   TIMESTAMPTZ,
  purchased_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_event ON tickets(event_id);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_stripe ON tickets(stripe_payment_intent_id);

-- RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Users see their own tickets
CREATE POLICY tickets_select_own ON tickets FOR SELECT USING (
  auth.uid() = user_id
);

-- Event organizers see all tickets for their events
CREATE POLICY tickets_select_organizer ON tickets FOR SELECT USING (
  auth.uid() IN (SELECT organizer_id FROM events WHERE id = event_id)
);

-- Tickets created via API (service role) or user
CREATE POLICY tickets_insert ON tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
