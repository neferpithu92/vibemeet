import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase con Service Role Key.
 * DA USARE SOLO LATO SERVER. Bypassa completamente l'RLS.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
