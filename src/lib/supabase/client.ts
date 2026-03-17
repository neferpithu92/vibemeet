'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side Supabase client per componenti browser.
 * Usa createBrowserClient() da @supabase/ssr per gestire
 * automaticamente i cookie di sessione.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
