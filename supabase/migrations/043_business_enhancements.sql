-- 043: Business Enhancements
-- Adds capacity, parking, and QR-ticketing infrastructure for Venue/Business roles.

-- 1. Venue Capacity & Parking
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS total_capacity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_occupancy INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_parking_spots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_parking_spots INTEGER DEFAULT 0;

-- 2. Event Ticket Inventory
ALTER TABLE events
ADD COLUMN IF NOT EXISTS total_tickets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tickets_sold INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT FALSE;

-- 3. QR Ticket Validation Table
-- Tracks unique ticket instances for validation
CREATE TABLE IF NOT EXISTS ticket_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_code_hash TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'valid', -- valid | used | cancelled
  used_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for QR scanning performance
CREATE INDEX idx_ticket_qr_hash ON ticket_instances(qr_code_hash);

-- 4. RLS for Business Features
ALTER TABLE ticket_instances ENABLE ROW LEVEL SECURITY;

-- Business user can see tickets for their own events
CREATE POLICY "Venue owners can view tickets for their events"
ON ticket_instances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN venues v ON e.venue_id = v.id
    WHERE e.id = ticket_instances.event_id
    AND v.owner_id = auth.uid()
  )
);

-- Business user can update (validate) tickets
CREATE POLICY "Venue owners can validate (update) tickets"
ON ticket_instances FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events e
    JOIN venues v ON e.venue_id = v.id
    WHERE e.id = ticket_instances.event_id
    AND v.owner_id = auth.uid()
  )
);

-- User can see their own tickets
CREATE POLICY "Users can view their own tickets"
ON ticket_instances FOR SELECT
USING (auth.uid() = user_id);

-- 5. Auto-update is_sold_out trigger
CREATE OR REPLACE FUNCTION check_ticket_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tickets_sold >= NEW.total_tickets AND NEW.total_tickets > 0 THEN
    NEW.is_sold_out := TRUE;
  ELSE
    NEW.is_sold_out := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_sold_out
BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION check_ticket_inventory();
