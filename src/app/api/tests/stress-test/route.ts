import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * TEST API: Stress Simulation (Flash Mob)
 * Questo endpoint simula 300 utenti che si registrano a un evento premium.
 * Utilizza la RPC simulate_event_stress creata in migrazione 998.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'event'; // 'event' or 'map'
  const eventId = searchParams.get('eventId') || 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'; // Neon Nights Festival
  const userCountInput = parseInt(searchParams.get('users') || (mode === 'map' ? '10000' : '300'));
  
  const supabase = await createClient();

  // 1. Verifica autorizzazione (solo in produzione)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Autorizzazione richiesta' }, { status: 401 });
  }

  console.log(`[STRESS-TEST] Avvio simulazione ${mode} per ${userCountInput} utenti...`);

  let rpcName = 'simulate_event_stress';
  let rpcArgs: any = { p_event_id: eventId, p_user_count: userCountInput };

  if (mode === 'map') {
    rpcName = 'simulate_map_presence_stress';
    rpcArgs = { 
      p_user_count: userCountInput,
      p_center_lng: 8.5417, // Zurich
      p_center_lat: 47.3769,
      p_radius_km: 20.0
    };
  }

  // 2. Chiamata alla RPC di sistema
  const { data, error } = await supabase.rpc(rpcName, rpcArgs);

  if (error) {
    console.error('[STRESS-TEST] Errore simulazione:', error);
    return NextResponse.json({ 
      error: 'Simulazione fallita', 
      details: error.message,
      hint: `Assicurati di aver eseguito le migrazioni stress_test_rpc.sql`
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    mode,
    simulation_results: data,
    metrics: {
      batch_size: userCountInput,
      timestamp: new Date().toISOString(),
      platform_load: userCountInput >= 10000 ? 'EXTREME' : 'HIGH'
    }
  });
}
