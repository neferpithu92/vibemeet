import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createRateLimiter, rateLimitResponse } from '@/lib/rate-limit';

const limiter = createRateLimiter({ requests: 5, window: '60s' }); // Max 5 eventi in 1 minuto

/**
 * API per creare un nuovo evento da parte di un proprietario di Venue.
 */
export async function POST(req: Request) {
  try {
    // Rate Limiting by IP
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await limiter.limit(`create_event_${ip}`);
    if (!success) return rateLimitResponse();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      title, 
      description, 
      category, 
      venueId, 
      startTime, 
      endTime, 
      coverUrl, 
      price, 
      ticketLimit 
    } = body;

    // Inserimento evento
    const { data: event, error } = await supabase
      .from('events')
      .insert([{
        organizer_id: user.id,
        venue_id: venueId,
        title,
        description,
        category,
        start_time: startTime,
        end_time: endTime,
        cover_url: coverUrl,
        price,
        ticket_limit: ticketLimit,
        status: 'published'
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ event });
  } catch (err: any) {
    console.error('Errore creazione evento:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
