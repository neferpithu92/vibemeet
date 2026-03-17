'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface Event {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  music_genres: string[];
  ticket_price: number;
  status: string;
  is_promoted: boolean;
  actual_crowd: number;
  rsvp_count: number;
  category: string;
  venue?: {
    name: string;
    city: string;
  };
}

interface EventsClientProps {
  initialEvents: Event[];
}

const filters = {
  time: ['Tutti', 'Oggi', 'Domani', 'Questa settimana'],
  genre: ['Tutti', 'Techno', 'House', 'DnB', 'Jazz', 'Hip-Hop', 'Rock', 'Pop'],
};

export default function EventsClient({ initialEvents }: EventsClientProps) {
  const t = useTranslations('events');
  const locale = useLocale();
  const dateLocale = locale === 'it' ? it : enUS;

  const [activeTimeFilter, setActiveTimeFilter] = useState('Tutti');
  const [activeGenreFilter, setActiveGenreFilter] = useState('Tutti');

  const filteredEvents = useMemo(() => {
    return initialEvents.filter(event => {
      const genreMatch = activeGenreFilter === 'Tutti' || (event.music_genres && event.music_genres.includes(activeGenreFilter));
      
      let timeMatch = true;
      const eventDate = new Date(event.starts_at);
      const now = new Date();
      
      if (activeTimeFilter === 'Oggi') {
        timeMatch = eventDate.toDateString() === now.toDateString();
      } else if (activeTimeFilter === 'Domani') {
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        timeMatch = eventDate.toDateString() === tomorrow.toDateString();
      } else if (activeTimeFilter === 'Questa settimana') {
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        timeMatch = eventDate >= now && eventDate <= nextWeek;
      }
      
      return genreMatch && timeMatch;
    });
  }, [initialEvents, activeGenreFilter, activeTimeFilter]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold vibe-gradient-text">{t('title')}</h1>
        <Button variant="primary" size="sm" onClick={() => (window.location.href = '/create')}>
          <span className="flex items-center gap-2">
            <span>➕</span> {t('createEvent')}
          </span>
        </Button>
      </div>

      {/* Filtri temporal */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
        {filters.time.map((f) => (
          <button
            key={f}
            onClick={() => setActiveTimeFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
              activeTimeFilter === f
                ? 'bg-vibe-purple/20 text-vibe-purple border border-vibe-purple/20'
                : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Filtri genere */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
        {filters.genre.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenreFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              activeGenreFilter === g
                ? 'bg-vibe-cyan/20 text-vibe-cyan border border-vibe-cyan/20'
                : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredEvents.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`}>
            <Card hover padding="none" className="overflow-hidden cursor-pointer group h-full border-white/5">
              {/* Cover Placeholder or Image */}
              <div className="relative h-40 bg-vibe-gradient-subtle">
                <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark/80 to-transparent" />
                {event.is_promoted && (
                  <div className="absolute top-3 left-3">
                    <Badge variant="premium">⚡ Promosso</Badge>
                  </div>
                )}
                {event.status === 'live' && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="live">LIVE</Badge>
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <Badge variant="default">{event.category || 'Event'}</Badge>
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/80">
                  <span className="text-sm">👥</span>
                  <span className="text-sm font-semibold">
                    {event.status === 'live' ? event.actual_crowd : event.rsvp_count}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-white/5 backdrop-blur-sm">
                <h3 className="font-display font-bold text-base mb-1 group-hover:text-vibe-purple transition-colors line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-sm text-vibe-text-secondary mb-2 line-clamp-1">
                  {event.venue?.name || 'VIBE'} · {event.venue?.city || 'Svizzera'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-vibe-text-secondary">
                      📅 {format(new Date(event.starts_at), 'EEE d MMM', { locale: dateLocale })}
                    </span>
                    <span className="text-xs text-vibe-text-secondary">
                      🕐 {format(new Date(event.starts_at), 'HH:mm', { locale: dateLocale })}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${event.ticket_price === 0 ? 'text-green-400' : 'text-vibe-cyan'}`}>
                    {event.ticket_price === 0 ? 'Gratuito' : `CHF ${event.ticket_price}`}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      
      {filteredEvents.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <p className="text-vibe-text-secondary">{t('noEvents')}</p>
        </div>
      )}
    </>
  );
}
