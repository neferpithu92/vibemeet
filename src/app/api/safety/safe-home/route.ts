import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Gestione Safe Home (Buddy System)
 * POST: Inizia sessione
 * PATCH: Conferma arrivo / Aggiorna posizione
 * GET: Stato sessione attiva
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { data: session } = await (supabase
    .from('safe_home_sessions') as any)
    .select('*, profiles:trusted_contact_id(full_name, avatar_url)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  return NextResponse.json({ session });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { trustedContactId, expectedHomeAt } = await req.json();

  const { data: session, error } = await (supabase
    .from('safe_home_sessions') as any)
    .insert([{
      user_id: user.id,
      trusted_contact_id: trustedContactId,
      expected_home_at: expectedHomeAt,
      status: 'active'
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

  const { sessionId, status, lastKnownLocation } = await req.json();

  const { data: session, error } = await (supabase
    .from('safe_home_sessions') as any)
    .update({ 
      status, 
      confirmed_safe_at: status === 'safe' ? new Date().toISOString() : null,
      last_known_location: lastKnownLocation
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session });
}
