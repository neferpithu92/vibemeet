import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const results: any = {};

  const tablesToProbe = [
    'users', 'venues', 'events', 'media', 'follows', 'likes', 
    'comments', 'notifications', 'stories', 'direct_messages', 
    'conversations', 'live_streams', 'point_transactions', 'user_badges'
  ];
  
  results.probes = {};
  
  for (const table of tablesToProbe) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      results.probes[table] = {
        exists: !error || error.code !== '42P01',
        columns: data && data.length > 0 ? Object.keys(data[0]) : (error ? error.message : 'Empty (No Data)')
      };
    } catch (err: any) {
      results.probes[table] = { error: err.message };
    }
  }

  return NextResponse.json(results);
}
