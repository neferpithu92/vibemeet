import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRateLimiter, rateLimitResponse } from '@/lib/rate-limit';

const limiter = createRateLimiter({ requests: 12, window: '10s' }); // Max 12 scansioni ogni 10s

export async function POST(request: NextRequest) {
  // Rate Limiting by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await limiter.limit(`ticket_scan_${ip}`);
  if (!success) return rateLimitResponse();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Controllo base: ruolo dell'utente
    const { data: userData } = await (supabase
      .from('users') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || ((userData as any).role !== 'venue' && (userData as any).role !== 'artist' && (userData as any).role !== 'admin')) {
      return NextResponse.json({ error: 'Solo gli organizzatori possono validare biglietti.' }, { status: 403 });
    }

    // 2. Controllo piano Premium
    const { data: subscription } = await (supabase
      .from('subscriptions') as any)
      .select('plan, status')
      .eq('entity_id', user.id)
      .eq('status', 'active')
      .single();

    if ((userData as any).role !== 'admin' && (!subscription || ((subscription as any).plan !== 'premium' && (subscription as any).plan !== 'enterprise'))) {
      return NextResponse.json({ error: 'Paywall: Upgrade a Premium richiesto per usare lo scanner.' }, { status: 403 });
    }

    const { qrData } = await request.json();

    if (!qrData) {
      return NextResponse.json({ error: 'QR Code mancante' }, { status: 400 });
    }

    // Usiamo il qrData come stringa RAW (generata dal nostro webhook)
    const qrCode = qrData;

    // Fetch ticket
    const { data: ticket, error } = await (supabase
      .from('tickets') as any)
      .select('*, events(organizer_id, title, id)')
      .eq('qr_code', qrCode)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ valid: false, reason: 'Biglietto non trovato o QR invalido.' });
    }

    // Check se l'evento è suo
    if ((userData as any).role !== 'admin' && (ticket as any).events?.organizer_id !== user.id) {
       return NextResponse.json({ valid: false, reason: 'Questo biglietto appartiene a un altro organizzatore.' });
    }

    // Validate
    if ((ticket as any).status === 'used' || (ticket as any).checked_in_at) {
      return NextResponse.json({
        valid: false,
        reason: 'BIGLIETTO GIÀ UTILIZZATO!',
        ticket: { id: (ticket as any).id, status: 'used', event_title: (ticket as any).events?.title }
      });
    }

    if ((ticket as any).status === 'cancelled' || (ticket as any).status === 'refunded') {
      return NextResponse.json({ valid: false, reason: 'Biglietto cancellato' });
    }
    
    if ((ticket as any).status !== 'paid') {
      return NextResponse.json({ valid: false, reason: `Biglietto non valido. Stato: ${(ticket as any).status}` });
    }

    // Marca automaticamente se l'organizzatore sta scansionando
    const { error: updateError } = await (supabase
      .from('tickets') as any)
      .update({
        status: 'used',
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id
      })
      .eq('id', (ticket as any).id);

    if (updateError) throw updateError;

    return NextResponse.json({
      valid: true,
      ticket: {
        id: ticket.id,
        event_title: (ticket.events as any)?.title,
        status: 'used'
      }
    });

  } catch (err) {
    console.error('Validate error:', err);
    return NextResponse.json({ valid: false, reason: 'Errore di sistema' });
  }
}

