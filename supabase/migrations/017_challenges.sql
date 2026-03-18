-- ============================================================
-- 017: Challenges & Gamification
-- Recurring weekly challenges, user participation
-- ============================================================

CREATE TABLE IF NOT EXISTS challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  hashtag_id      UUID REFERENCES hashtags(id),
  reward_points   INTEGER DEFAULT 100,
  sponsor_id      UUID REFERENCES venues(id) ON DELETE SET NULL, -- Se sponsorizzata da un club
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  challenge_id    UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id         UUID REFERENCES media(id) ON DELETE CASCADE,
  points_awarded  INTEGER DEFAULT 0,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id, post_id)
);

-- Tabella per i punti utente
ALTER TABLE users ADD COLUMN IF NOT EXISTS 
  vibe_points INTEGER DEFAULT 0;

-- Funzione per assegnare i punti automaticamente
CREATE OR REPLACE FUNCTION award_challenge_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
BEGIN
  -- Trova i punti della challenge
  SELECT reward_points INTO v_points FROM challenges WHERE id = NEW.challenge_id;
  
  -- Assegna punti al record
  NEW.points_awarded = v_points;
  
  -- Aggiorna i punti utente
  UPDATE users SET vibe_points = vibe_points + v_points WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER award_points_trigger
  BEFORE INSERT ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION award_challenge_points();

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY challenges_select ON challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY participants_select ON challenge_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY participants_insert ON challenge_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
