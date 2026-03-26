-- ============================================================
-- 030: Public Keys Registry for E2E DMs
-- Adds public_key column to users for asynchronous encryption
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS public_key TEXT;
