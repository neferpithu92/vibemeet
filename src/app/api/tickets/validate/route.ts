import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { qrData } = await request.json();

    // Decode QR payload: base64 JSON { ticketId, eventId, userId }
    let ticketId: string;
    try {
      const decoded = JSON.parse(atob(qrData));
      ticketId = decoded.ticketId;
    } catch {
      return NextResponse.json({ valid: false, reason: 'QR non valido' });
    }

    // Fetch ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*, events(title, id)')
      .eq('id', ticketId)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ valid: false, reason: 'Biglietto non trovato' });
    }

    // Validate
    if (ticket.status === 'used' || ticket.checked_in_at) {
      return NextResponse.json({
        valid: true,
        ticket: {
          id: ticket.id,
          attendee_name: ticket.attendee_name,
          ticket_type: ticket.ticket_type,
          event_title: (ticket.events as any)?.title,
          status: 'used'
        }
      });
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return NextResponse.json({ valid: false, reason: 'Biglietto cancellato' });
    }

    return NextResponse.json({
      valid: true,
      ticket: {
        id: ticket.id,
        attendee_name: ticket.attendee_name,
        ticket_type: ticket.ticket_type,
        event_title: (ticket.events as any)?.title,
        status: 'valid'
      }
    });
  } catch (err) {
    console.error('Validate error:', err);
    return NextResponse.json({ valid: false, reason: 'Errore di sistema' });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { ticketId } = await request.json();

    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'used',
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id
      })
      .eq('id', ticketId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to mark used' }, { status: 500 });
  }
}
