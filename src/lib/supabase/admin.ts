import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Client Supabase con Service Role Key.
 * DA USARE SOLO LATO SERVER. Bypassa completamente l'RLS.
 */
export const getSupabaseAdmin = () => {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase Admin configuration');
  }

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
};
