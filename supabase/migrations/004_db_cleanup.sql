-- ============================================================
-- VIBE Platform — Migrazione 004: Cleanup e Coerenza
-- ============================================================

-- Fix naming discrepancy for user location
-- In 001 era 'location', in 003 era richiesto 'last_location'
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location') THEN
    ALTER TABLE users RENAME COLUMN location TO last_location;
  END IF;
END $$;

-- Assicuriamoci che l'indice GIST sia aggiornato
DROP INDEX IF EXISTS idx_users_location;
CREATE INDEX IF NOT EXISTS idx_users_last_location ON users USING GIST(last_location);

-- Aggiunta indici GIST per media e stories (ottimizzazione mappa)
CREATE INDEX IF NOT EXISTS idx_media_location_gist ON media USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_stories_location_gist ON stories USING GIST(location);

-- Aggiunta colonna 'vibe_score' agli eventi per coerenza con le venue
ALTER TABLE events ADD COLUMN IF NOT EXISTS vibe_score DECIMAL(3,2) DEFAULT 0;

-- Drop vecchie funzioni se necessario
-- DROP FUNCTION IF EXISTS get_nearby_users CASCADE;
-- (La funzione in 003 dovrebbe ora funzionare correttamente con 'last_location')
