'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

/* ======= DEMO DATA ======= */
const events = [
  {
    id: '1', title: 'Neon Nights Festival', venue: 'Club Paradiso', city: 'Zurigo',
    date: 'Stasera', time: '23:00 - 05:00', genre: 'Techno', price: 'CHF 35',
    crowd: 342, rsvp: 450, status: 'live', isPromoted: true,
  },
  {
    id: '2', title: 'Jazz al Lago', venue: 'Lido Lounge', city: 'Lugano',
    date: 'Domani', time: '20:00 - 23:00', genre: 'Jazz', price: 'CHF 15',
    crowd: 89, rsvp: 120, status: 'scheduled', isPromoted: false,
  },
  {
    id: '3', title: 'Carnival Bass', venue: 'Gaswerk', city: 'Berna',
    date: 'Sabato', time: '22:00 - 06:00', genre: 'DnB', price: 'CHF 45',
    crowd: 0, rsvp: 567, status: 'scheduled', isPromoted: true,
  },
  {
    id: '4', title: 'Aperitivo Live', venue: 'Terrazza Milano', city: 'Basilea',
    date: 'Oggi', time: '18:00 - 21:00', genre: 'Lounge', price: 'Gratuito',
    crowd: 45, rsvp: 78, status: 'live', isPromoted: false,
  },
  {
    id: '5', title: 'Underground Session', venue: 'Bunker Club', city: 'Ginevra',
    date: 'Venerdì', time: '00:00 - 08:00', genre: 'Techno', price: 'CHF 25',
    crowd: 0, rsvp: 234, status: 'scheduled', isPromoted: false,
  },
  {
    id: '6', title: 'Open Air Vibes', venue: 'Parco Ciani', city: 'Lugano',
    date: 'Domenica', time: '14:00 - 22:00', genre: 'House', price: 'Gratuito',
    crowd: 0, rsvp: 890, status: 'scheduled', isPromoted: true,
  },
];

const filters = {
  time: ['Tutti', 'Oggi', 'Domani', 'Questa settimana', 'Questo mese'],
  genre: ['Tutti', 'Techno', 'House', 'DnB', 'Jazz', 'Hip-Hop', 'Rock', 'Pop'],
};

/**
 * Pagina listing eventi con filtri avanzati.
 */
export default function EventsPage() {
  const [activeTimeFilter, setActiveTimeFilter] = useState('Tutti');
  const [activeGenreFilter, setActiveGenreFilter] = useState('Tutti');

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold vibe-gradient-text">Eventi</h1>
          <Button variant="primary" size="sm">
            <span className="flex items-center gap-2">
              <span>➕</span> Crea evento
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
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <Card hover padding="none" className="overflow-hidden cursor-pointer group h-full">
                {/* Cover */}
                <div className="relative h-40 bg-vibe-gradient-subtle">
                  <div className="absolute inset-0 bg-gradient-to-t from-vibe-surface to-transparent" />
                  {event.isPromoted && (
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
                    <Badge variant="default">{event.genre}</Badge>
                  </div>
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/80">
                    <span className="text-sm">👥</span>
                    <span className="text-sm font-semibold">
                      {event.status === 'live' ? event.crowd : event.rsvp}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-display font-bold text-base mb-1 group-hover:text-vibe-purple transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm text-vibe-text-secondary mb-2">
                    {event.venue} · {event.city}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-vibe-text-secondary">📅 {event.date}</span>
                      <span className="text-xs text-vibe-text-secondary">🕐 {event.time}</span>
                    </div>
                    <span className={`text-sm font-semibold ${event.price === 'Gratuito' ? 'text-green-400' : 'text-vibe-cyan'}`}>
                      {event.price}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
