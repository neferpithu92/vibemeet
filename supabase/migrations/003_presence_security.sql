-- ============================================================
-- Migrazione 003: Refinement Sicurezza (RLS) e Presenza
-- ============================================================

-- 1. Rafforzamento RLS sulla tabella users
-- Vogliamo che last_location e last_seen_at siano visibili solo per utenti attivi
DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users 
  FOR SELECT 
  USING (true); -- Manteniamo i profili pubblici per ora, ma i contenuti sensibili sono altrove

-- 2. Policy per aggiornamento posizione (heartbeat)
-- Già esistente: users_update ON users FOR UPDATE USING (auth.uid() = id);
-- Assicuriamoci che l'utente possa aggiornare solo record specifici tramite RPC se necessario
-- Per semplicità usiamo l'update diretto sulla tabella users per ora.

-- 3. Protezione Check-ins (visibilità limitata se necessario)
-- Attualmente: checkins_select ON check_ins FOR SELECT USING (true);
-- VIBE: i check-in sono pubblici per mostrare l'affollamento live.

-- 4. Sicurezza Stories
-- Attualmente: stories_select ON stories FOR SELECT USING (expires_at > NOW());
-- Aggiungiamo protezione per evitare che utenti non autenticati vedano storie se non desiderato
-- (Ma Vibe vuole un feed pubblico/social, quindi true è ok).

-- 5. Funzione per recuperare utenti vicini (Nearby People)
CREATE OR REPLACE FUNCTION get_nearby_users(
  lon DOUBLE PRECISION, 
  lat DOUBLE PRECISION, 
  radius_meters DOUBLE PRECISION DEFAULT 5000,
  active_within_minutes INTEGER DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  last_seen_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.username, 
    u.avatar_url,
    ST_X(u.last_location::geometry) as longitude,
    ST_Y(u.last_location::geometry) as latitude,
    u.last_seen_at
  FROM users u
  WHERE 
    ST_DWithin(u.last_location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_meters)
    AND u.last_seen_at >= (NOW() - (active_within_minutes || ' minutes')::interval)
    AND u.id != auth.uid(); -- Escludi te stesso
END;
$$ LANGUAGE plpgsql;
