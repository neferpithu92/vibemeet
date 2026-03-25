-- SUPER-FIX: Global Schema & RPC Alignment (System 14)
-- This fixes the mismatch between 'location' vs 'last_location' and ensures Profile fetching works correctly.

DO $$
BEGIN
    -- Ensure display_name exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'display_name') THEN
        ALTER TABLE public.users ADD COLUMN display_name TEXT;
    END IF;

    -- Ensure avatar_url exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    END IF;

    -- Ensure bio exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'bio') THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
    END IF;

    -- Ensure is_verified exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'is_verified') THEN
        ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;

    -- FIX: Rename 'location' to 'last_location' if needed for consistency with frontend/database.ts
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'location') 
       AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'last_location') THEN
        ALTER TABLE public.users RENAME COLUMN location TO last_location;
    ELSIF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'last_location') THEN
        ALTER TABLE public.users ADD COLUMN last_location GEOGRAPHY(POINT, 4326);
    END IF;

END $$;

-- Update Heartbeat RPC to be resilient
CREATE OR REPLACE FUNCTION update_user_location(lon float8, lat float8)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET 
    last_location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    last_seen_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BROAD RLS REFRESH (Ensure Profile/Presence is readable)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS users_insert ON public.users;
CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
