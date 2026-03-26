-- ============================================================
-- 026: Theme Preferences
-- Adds theme support (dark/light + presets) to user settings
-- ============================================================

-- Aggiungi colonne per il tema
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS custom_theme_hsl JSONB DEFAULT '{"h": 260, "s": 100, "l": 60}'::jsonb;
