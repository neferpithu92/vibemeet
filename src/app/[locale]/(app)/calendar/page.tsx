'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';

interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  cover_url: string | null;
  venue?: { name: string; address: string } | null;
}

interface CalendarTicket {
  id: string;
  qr_code: string;
  status: string;
  events: CalendarEvent | null;
}

interface RawTicket {
  id: string;
  qr_code: string;
  status: string;
  events: CalendarEvent | CalendarEvent[] | null;
}

export default function CalendarPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<CalendarTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data } = await supabase
        .from('tickets')
        .select(`
          id, qr_code, status,
          events ( id, title, starts_at, cover_url, venue:venues(name, address) )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const normalized: CalendarTicket[] = (data as any[]).map(t => {
          const rawEvent = Array.isArray(t.events) ? t.events[0] : t.events;
          const venue = rawEvent?.venue ? (Array.isArray(rawEvent.venue) ? rawEvent.venue[0] : rawEvent.venue) : null;
          return {
            id: t.id,
            qr_code: t.qr_code,
            status: t.status,
            events: rawEvent ? { ...rawEvent, venue } : null
          };
        });
        setTickets(normalized);
      }
      setLoading(false);
    }
    fetchTickets();
  }, [supabase]);

  if (loading) return (
    <div className="p-8 text-center text-vibe-text-secondary min-h-screen pt-32">
      Caricamento...
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 mt-16 min-h-screen">
      <h1 className="text-3xl font-bold font-display text-white mb-2">
        Il tuo Calendario
      </h1>
      <p className="text-vibe-text-secondary mb-8">
        I tuoi prossimi eventi e biglietti acquistati.
      </p>

      {tickets.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-vibe-text-secondary">
            Non hai nessun evento in programma.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <Card key={t.id} className="p-4 flex flex-col md:flex-row gap-4 bg-white/5 hover:bg-white/10 transition-colors border-white/10">
              {t.events?.cover_url ? (
                <img
                  src={t.events.cover_url}
                  alt="Event"
                  className="w-full md:w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full md:w-32 h-32 bg-white/5 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">🎫</span>
                </div>
              )}
              <div className="flex-1 py-1">
                <h3 className="font-bold text-lg text-white mb-1">
                  {t.events?.title || 'Evento non trovato'}
                </h3>
                <p className="text-sm text-vibe-text-secondary mb-1">
                  📍 {t.events?.venue?.address || 'Da confermare'}
                </p>
                <p className="text-sm text-vibe-purple font-medium mb-3">
                  {t.events?.starts_at
                    ? new Date(t.events.starts_at).toLocaleString('it-IT')
                    : ''}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center min-w-[120px] md:border-l border-white/10 md:pl-6 pt-4 md:pt-0">
                <div className="p-2 bg-white rounded-xl mb-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${t.qr_code}`}
                    alt="QR Code"
                    width={64}
                    height={64}
                  />
                </div>
                <span className={`text-xs font-bold uppercase ${
                  t.status === 'valid' ? 'text-vibe-green' : 'text-red-400'
                }`}>
                  {t.status === 'valid' ? 'Valido' : 'Usato/Scaduto'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
