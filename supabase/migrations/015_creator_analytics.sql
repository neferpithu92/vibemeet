-- ============================================================
-- 015: Analytics & Creator Dashboard
-- Event analytics, creator stats, materialized views
-- ============================================================

CREATE TABLE IF NOT EXISTS event_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  creator_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  views           INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  tickets_sold    INTEGER DEFAULT 0,
  revenue_chf     DECIMAL DEFAULT 0.00,
  shares          INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,
  demographics    JSONB DEFAULT '{}', -- { "age_18_24": 45, "male": 60 } ecc.
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(event_id, date)
);

CREATE INDEX idx_event_analytics_creator ON event_analytics(creator_id, date);
CREATE INDEX idx_event_analytics_event ON event_analytics(event_id, date);

-- Funzione per aggiornare le statistiche al volo (da chiamare via RPC o trigger)
CREATE OR REPLACE FUNCTION record_event_view(p_event_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO event_analytics (event_id, creator_id, views, date)
  SELECT p_event_id, e.creator_id, 1, CURRENT_DATE
  FROM events e WHERE e.id = p_event_id
  ON CONFLICT (event_id, date) 
  DO UPDATE SET views = event_analytics.views + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profilo Creator Stats (Mat. View o Tabella aggregata per la dashboard)
CREATE TABLE IF NOT EXISTS creator_stats (
  creator_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_followers INTEGER DEFAULT 0,
  total_events    INTEGER DEFAULT 0,
  total_tickets_sold INTEGER DEFAULT 0,
  total_revenue   DECIMAL DEFAULT 0.00,
  profile_views   INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY creator_analytics_select ON event_analytics FOR SELECT TO authenticated USING (
  creator_id = auth.uid()
);

CREATE POLICY creator_stats_select ON creator_stats FOR SELECT TO authenticated USING (
  creator_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
