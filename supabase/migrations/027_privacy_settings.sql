-- ============================================================
-- 027: Privacy Control Center
-- Setup granular privacy settings and Blacklist (user_blocks)
-- ============================================================

-- 1. Aggiorna user_settings con granular privacy controls
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS location_radius TEXT DEFAULT '500m', -- '100m', '500m', 'city', 'off'
ADD COLUMN IF NOT EXISTS event_anon_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_visibility TEXT DEFAULT 'followers'; -- 'everyone', 'followers', 'none'

-- 2. Creazione della tabella user_blocks per la Blacklist
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- RLS for user_blocks
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_blocks_select ON public.user_blocks
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY user_blocks_insert ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY user_blocks_delete ON public.user_blocks
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- 3. Update get_fyp_algo_feed to filter blocked users
-- Drop then recreate to add the blocklist logic.
DROP FUNCTION IF EXISTS public.get_fyp_algo_feed;

CREATE OR REPLACE FUNCTION public.get_fyp_algo_feed(
  viewer_id UUID,
  page_size INT DEFAULT 10,
  page_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  media_url TEXT,
  media_type TEXT,
  caption TEXT,
  location_name TEXT,
  created_at TIMESTAMPTZ,
  likes_count INT,
  comments_count INT,
  score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH media_scores AS (
    SELECT 
      m.id,
      m.author_id,
      m.media_url,
      m.media_type,
      m.caption,
      m.location_name,
      m.created_at,
      m.likes_count,
      m.comments_count,
      -- Algoritmo base: Popolarità e Recency
      ( (m.likes_count * 2) + (m.comments_count * 3) ) / 
        GREATEST(EXTRACT(EPOCH FROM (NOW() - m.created_at)) / 3600, 1.0) 
      AS base_score
    FROM public.media m
    WHERE 
      -- Cursor pagination
      (page_cursor IS NULL OR m.created_at < page_cursor)
      -- Blacklist Filter: The author is not blocked by the viewer
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub 
        WHERE ub.blocker_id = viewer_id AND ub.blocked_id = m.author_id
      )
      -- Blacklist Filter: The viewer is not blocked by the author
      AND NOT EXISTS (
        SELECT 1 FROM public.user_blocks ub 
        WHERE ub.blocker_id = m.author_id AND ub.blocked_id = viewer_id
      )
  )
  SELECT 
    ms.id, ms.author_id, ms.media_url, ms.media_type, 
    ms.caption, ms.location_name, ms.created_at, 
    ms.likes_count, ms.comments_count,
    -- Punteggio finale arricchito dall'affinità (se esiste)
    (ms.base_score + COALESCE(ua.affinity_score, 0))::FLOAT AS score
  FROM media_scores ms
  LEFT JOIN public.user_affinities ua 
    ON ua.user_id = viewer_id AND ua.target_id = ms.author_id
  ORDER BY score DESC, ms.created_at DESC
  LIMIT page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
