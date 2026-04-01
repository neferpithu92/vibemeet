import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * TEST API: Stress Simulation (Flash Mob)
 * Questo endpoint simula 300 utenti che si registrano a un evento premium.
 * Utilizza la RPC simulate_event_stress creata in migrazione 998.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId') || 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'; // Neon Nights Festival
  const userCount = parseInt(searchParams.get('users') || '300');

  const supabase = await createClient();

  // 1. Verifica autorizzazione (solo se necessario, qui permettiamo per il test)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Autorizzazione richiesta' }, { status: 401 });
  }

  console.log(`[STRESS-TEST] Avvio simulazione per ${userCount} utenti sull'evento ${eventId}...`);

  // 2. Chiamata alla RPC di sistema per la simulazione massiva
  // Questa funzione deve essere creata nel DB tramite la migrazione 998
  const { data, error } = await supabase.rpc('simulate_event_stress', {
    p_event_id: eventId,
    p_user_count: userCount
  });

  if (error) {
    console.error('[STRESS-TEST] Errore simulazione:', error);
    return NextResponse.json({ 
      error: 'Simulazione fallita', 
      details: error.message,
      hint: 'Assicurati di aver eseguito la migrazione 998_stress_test_rpc.sql'
    }, { status: 500 });
  }

  // Se l'evento non è quello di default, verifichiamo se l'organizzatore è premium
  const { data: eventData } = await supabase
    .from('events')
    .select(`
       id,
       title,
       organizer:users (display_name, role, is_verified)
    `)
    .eq('id', eventId)
    .single();

  return NextResponse.json({
    success: true,
    simulation_results: data,
    event: {
      id: eventId,
      title: eventData?.title,
      organizer: eventData?.organizer,
      premium_status: (eventData?.organizer as any)?.is_verified ? 'PREMIUM (Verified)' : 'STANDARD'
    },
    metrics: {
      batch_size: userCount,
      timestamp: new Date().toISOString(),
      platform_load: 'HIGH'
    }
  });
}
