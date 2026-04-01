-- ============================================================
-- Migration: Add category column to events table
-- ============================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;

-- Index for performance in filtering
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);

COMMENT ON COLUMN events.category IS 'Categoria dell''evento (es. Concerto, Clubbing, Aperitivo)';
