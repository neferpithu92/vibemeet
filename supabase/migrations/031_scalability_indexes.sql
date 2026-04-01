-- ============================================================
-- 031: Scalability B-Tree & GiST Indexes
-- Prepares the database for 100k+ concurrent users
-- ============================================================

-- 1. Index on Media for algorithmic pagination
-- The feed algorithm uses created_at and author_id (for blocklist joins).
CREATE INDEX IF NOT EXISTS idx_media_created_author ON public.media (created_at DESC, author_id);

-- 2. Index on User Settings
-- Needed because we join it on check-ins repeatedly to get `location_radius`.
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings (user_id);

-- 3. Blocklist Optimization (Bi-directional mapping)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks (blocked_id);

-- 4. Check_ins location indices (Heatmap performance)
-- For the bounds checking in get_heatmap_points RPC.
CREATE INDEX IF NOT EXISTS idx_check_ins_coords_time ON public.check_ins (longitude, latitude, created_at DESC)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 5. Venues filtering (Ambient Heatmap & Map features)
CREATE INDEX IF NOT EXISTS idx_venues_type_coords ON public.venues (type, longitude, latitude);

-- 6. User Interactions (For FYP Score calculation speedups)
CREATE INDEX IF NOT EXISTS idx_user_interactions_composite ON public.user_interactions (user_id, media_id, type);

-- 7. Affinities (If table exists, indexing the edge)
CREATE INDEX IF NOT EXISTS idx_user_affinities_edges ON public.user_affinities (user_id, target_id);
