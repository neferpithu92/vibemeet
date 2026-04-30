import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const results: any = { probes: {} };

  const tablesToProbe = [
    'users', 'venues', 'artists', 'events', 'event_artists', 'media', 
    'follows', 'likes', 'comments', 'notifications', 'stories', 
    'direct_messages', 'conversations', 'live_streams', 
    'point_transactions', 'user_badges', 'payments', 'subscriptions', 
    'tickets', 'ticket_instances', 'hashtags', 'post_hashtags', 
    'circles', 'social_circles', 'circle_members', 'check_ins',
    'user_settings', 'user_blocks', 'story_highlights', 'highlight_stories',
    'safe_home_sessions', 'trusted_contacts', 'trending_hashtags'
  ];
  
  for (const table of tablesToProbe) {
    try {
      // Verifica esistenza tramite una query minima
      const { error: existsError } = await supabase.from(table as any).select('count').limit(0);
      const exists = !existsError || existsError.code !== '42P01';

      if (exists) {
        // Query RPC custom o query diretta per introspezione (se possibile)
        // Poiché non abbiamo una RPC dedicata all'introspezione, usiamo una query select('*') 
        // ma cerchiamo di estrarre metadati se ci sono errori o dati.
        // In un sistema ideale useremmo information_schema, ma qui siamo limitati dal client Supabase.
        // Proviamo a fare una query che fallisce per mostrare le colonne o un insert finto in rollback?
        // No, usiamo la tecnica del select finto.
        const { data, error } = await supabase.from(table as any).select('*').limit(1);
        
        results.probes[table] = {
          exists: true,
          columns: data && data.length > 0 ? Object.keys(data[0]) : "Schema exists but no data to infer columns via client"
        };

        // Aggiungiamo un check specifico per le colonne critiche di V4 se la tabella è users o stories
        if (table === 'users') {
          const { data: userCols } = await supabase.from('users').select('vibe_points, onboarding_completed').limit(1);
          results.probes.users.v4_aligned = !!userCols;
        }
        if (table === 'stories') {
          const { data: storyCols } = await supabase.from('stories').select('type, text_content').limit(1);
          results.probes.stories.v4_aligned = !!storyCols;
        }
      } else {
         results.probes[table] = { exists: false };
      }
    } catch (err: any) {
      results.probes[table] = { error: err.message };
    }
  }

  return NextResponse.json(results);
}
