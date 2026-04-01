-- ============================================================
-- VIBE Platform — Seed Data
-- 005_seed_data.sql
-- ============================================================

-- Insert a test owner user if not exists
INSERT INTO users (id, email, username, display_name, role, is_verified)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner@vibe.ch', 'vibe_premium', 'VIBE Premium Club', 'venue', true)
ON CONFLICT (email) DO UPDATE SET is_verified = true, role = 'venue';

-- Insert Venues
INSERT INTO venues (id, owner_id, name, slug, description, type, address, city, location, music_genres, is_verified, avg_rating)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111', 
    '00000000-0000-0000-0000-000000000001', 
    'Club Paradiso', 
    'club-paradiso', 
    'Il miglior sound system di Zurigo.', 
    'club', 
    'Langstrasse 120', 
    'Zurigo', 
    ST_SetSRID(ST_MakePoint(8.5297, 47.3786), 4326), 
    ARRAY['Techno', 'House'], 
    true, 
    9.8
  ),
  (
    '22222222-2222-2222-2222-222222222222', 
    '00000000-0000-0000-0000-000000000001', 
    'Lido Lounge', 
    'lido-lounge', 
    'Aperitivi con vista lago mozzafiato.', 
    'bar', 
    'Riva Caccia 1', 
    'Lugano', 
    ST_SetSRID(ST_MakePoint(8.9467, 45.9983), 4326), 
    ARRAY['Jazz', 'Lounge'], 
    true, 
    9.2
  )
ON CONFLICT (slug) DO NOTHING;

-- Insert Events
INSERT INTO events (id, venue_id, organizer_id, title, description, slug, location, starts_at, ends_at, music_genres, ticket_price, status, is_promoted, category)
VALUES 
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'Neon Nights Festival',
    'Una notte immersiva tra luci neon e techno di alta qualità.',
    'neon-nights-festival',
    ST_SetSRID(ST_MakePoint(8.5297, 47.3786), 4326),
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '8 hours',
    ARRAY['Techno'],
    35.00,
    'scheduled',
    true,
    'Festival'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'Jazz al Lago',
    'Note soffuse al tramonto sul lungolago di Lugano.',
    'jazz-al-lago',
    ST_SetSRID(ST_MakePoint(8.9467, 45.9983), 4326),
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 4 hours',
    ARRAY['Jazz'],
    15.00,
    'scheduled',
    false,
    'Concert'
  )
ON CONFLICT (slug) DO NOTHING;
