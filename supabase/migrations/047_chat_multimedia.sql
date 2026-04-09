-- ============================================================
-- 047: Chat Multimedia & Read Receipt Fixes
-- Adds support for images/videos in direct messages.
-- ============================================================

ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT; -- 'photo' | 'video'

-- Optimization: Index for conversation sorting with read_at
CREATE INDEX IF NOT EXISTS idx_messages_unread 
ON public.direct_messages(conversation_id, read_at) 
WHERE read_at IS NULL;
