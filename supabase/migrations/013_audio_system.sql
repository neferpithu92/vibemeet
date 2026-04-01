-- ============================================================
-- 013: Audio System
-- Audio tracks, connection to media, trending audio
-- ============================================================

CREATE TABLE IF NOT EXISTS audio_tracks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  artist          TEXT,
  duration_seconds INTEGER,
  url             TEXT NOT NULL, -- Supabase Storage link
  waveform_data   JSONB, -- Per visualizzazione
  use_count       INTEGER DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_royalty_free BOOLEAN DEFAULT TRUE,
  genre           TEXT,
  bpm             INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audio_tracks_use ON audio_tracks(use_count DESC);
CREATE INDEX idx_audio_tracks_genre ON audio_tracks(genre);

-- Trigger updated_at
CREATE TRIGGER set_updated_at_audio_tracks 
  BEFORE UPDATE ON audio_tracks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add audio link to media
ALTER TABLE media ADD COLUMN IF NOT EXISTS 
  audio_track_id UUID REFERENCES audio_tracks(id) ON DELETE SET NULL;
ALTER TABLE media ADD COLUMN IF NOT EXISTS
  audio_start_seconds INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS
  audio_volume DECIMAL DEFAULT 1.0;

-- Trigger to increment/decrement use_count
CREATE OR REPLACE FUNCTION update_audio_use_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.audio_track_id IS NOT NULL THEN
    UPDATE audio_tracks SET use_count = use_count + 1 WHERE id = NEW.audio_track_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.audio_track_id IS NULL AND NEW.audio_track_id IS NOT NULL THEN
      UPDATE audio_tracks SET use_count = use_count + 1 WHERE id = NEW.audio_track_id;
    ELSIF OLD.audio_track_id IS NOT NULL AND NEW.audio_track_id IS NULL THEN
      UPDATE audio_tracks SET use_count = GREATEST(0, use_count - 1) WHERE id = OLD.audio_track_id;
    ELSIF OLD.audio_track_id != NEW.audio_track_id THEN
      UPDATE audio_tracks SET use_count = GREATEST(0, use_count - 1) WHERE id = OLD.audio_track_id;
      UPDATE audio_tracks SET use_count = use_count + 1 WHERE id = NEW.audio_track_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.audio_track_id IS NOT NULL THEN
    UPDATE audio_tracks SET use_count = GREATEST(0, use_count - 1) WHERE id = OLD.audio_track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audio_use_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON media
  FOR EACH ROW EXECUTE FUNCTION update_audio_use_count();

-- View for Trending Audio (last 24h usage)
CREATE OR REPLACE VIEW trending_audio AS
  SELECT at.*, COUNT(m.id) as used_in_vibes_last_24h
  FROM audio_tracks at
  JOIN media m ON m.audio_track_id = at.id
  WHERE m.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY at.id
  ORDER BY used_in_vibes_last_24h DESC
  LIMIT 20;

-- RLS
ALTER TABLE audio_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY audio_select ON audio_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY audio_insert ON audio_tracks FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = created_by AND 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('artist', 'venue', 'admin'))
);
