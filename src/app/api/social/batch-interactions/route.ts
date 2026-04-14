import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/social/batch-interactions
 * Receives a list of interaction events and processed them via Supabase RPC.
 */
export async function POST(req: Request) {
  try {
    const { interactions } = await req.json();
    const supabase = await createClient();

    if (!interactions || !Array.isArray(interactions)) {
      return NextResponse.json({ error: 'Interazioni non valide' }, { status: 400 });
    }

    // Call the RPC defined in Migration 035
    const { error } = await (supabase as any).rpc('process_batch_interactions', {
      p_interactions: interactions
    });

    if (error) {
      console.error('[BatchInteractions] RPC Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, processed: interactions.length });
  } catch (err: any) {
    console.error('[BatchInteractions] Server Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
