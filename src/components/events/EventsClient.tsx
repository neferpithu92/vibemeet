'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import CreateEvent from '@/components/events/CreateEvent';
import { Plus, Users, Calendar, Clock, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  music_genres: string[] | null;
  ticket_price: number | null;
  status: string;
  is_promoted: boolean;
  actual_crowd: number;
  rsvp_count: number;
  category: string;
  venue?: {
    name: string;
    city: string | null;
  } | null;
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
  const dateLocale = locale === 'it' ? it : locale === 'de' ? de : locale === 'fr' ? fr : enUS;

  const timeFilters = ['all', 'today', 'tomorrow', 'thisWeek'] as const;
  const genres = ['all', 'Techno', 'House', 'DnB', 'Jazz', 'Hip-Hop', 'Rock', 'Pop'] as const;

  const [activeTimeFilter, setActiveTimeFilter] = useState<typeof timeFilters[number]>('all');
  const [activeGenreFilter, setActiveGenreFilter] = useState<typeof genres[number]>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    return initialEvents.filter(event => {
      const genreMatch = activeGenreFilter === 'all' || (event.music_genres && event.music_genres.includes(activeGenreFilter));
      
      let timeMatch = true;
      const eventDate = new Date(event.starts_at);
      const now = new Date();
      
      if (activeTimeFilter === 'today') {
        timeMatch = eventDate.toDateString() === now.toDateString();
      } else if (activeTimeFilter === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);
        timeMatch = eventDate.toDateString() === tomorrow.toDateString();
      } else if (activeTimeFilter === 'thisWeek') {
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        timeMatch = eventDate >= now && eventDate <= nextWeek;
      }
      
      return genreMatch && timeMatch;
    });
  }, [initialEvents, activeGenreFilter, activeTimeFilter]);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-black vibe-gradient-text tracking-tighter uppercase">{t('title')}</h1>
        <Button variant="shining" size="sm" onClick={() => setIsCreateModalOpen(true)} className="px-5 h-11 rounded-2xl">
          <Plus className="w-4 h-4 mr-2" /> {t('createEvent')}
        </Button>
      </div>

      {/* Filtri temporal */}
      <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
        {timeFilters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveTimeFilter(f)}
            className={`px-5 py-2.5 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 tap-bounce ${
              activeTimeFilter === f
                ? 'bg-vibe-purple text-white shadow-[0_0_15px_rgba(157,78,221,0.4)]'
                : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
            }`}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      {/* Filtri genere */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
        {genres.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGenreFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ${
              activeGenreFilter === g
                ? 'bg-vibe-cyan/20 text-vibe-cyan border border-vibe-cyan/20'
                : 'bg-white/5 text-vibe-text-secondary hover:bg-white/10'
            }`}
          >
            {g === 'all' ? t('filters.all') : g}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredEvents.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`} className="tap-bounce">
            <Card padding="none" className="overflow-hidden cursor-pointer group h-full border-vibe-border hover:border-vibe-purple/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(157,78,221,0.15)]">
              {/* Cover Placeholder or Image */}
              <div className="relative h-48 bg-vibe-gradient-subtle overflow-hidden">
                <div className="absolute inset-0 shimmer opacity-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark/90 via-vibe-dark/20 to-transparent z-10" />
                
                {event.is_promoted && (
                  <div className="absolute top-3 left-3 z-20">
                    <Badge variant="premium">{t('promoted')}</Badge>
                  </div>
                )}
                {event.status === 'live' && (
                  <div className="absolute top-3 right-3 z-20">
                    <Badge variant="live">LIVE</Badge>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-4 z-20">
                  <div className="flex flex-col gap-1">
                    <Badge variant="default" className="w-fit">{event.category || t('placeholderCategory')}</Badge>
                    <h3 className="font-display font-black text-xl text-white group-hover:text-vibe-purple transition-colors line-clamp-2 leading-tight uppercase tracking-tighter">
                      {event.title}
                    </h3>
                  </div>
                </div>
                
                <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end">
                   <div className="flex items-center gap-1.5 text-white/90 font-black bg-black/50 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10">
                    <Users className="w-3.5 h-3.5 text-vibe-cyan" />
                    <span className="text-xs tracking-tighter">
                      {event.status === 'live' ? event.actual_crowd : event.rsvp_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest opacity-80 truncate">
                     {event.venue?.name || 'VIBE'} · {event.venue?.city || t('placeholderCity')}
                  </p>
                  <span className={`text-sm font-black tracking-tighter ${event.ticket_price === 0 ? 'text-green-400' : 'vibe-gradient-text'}`}>
                    {event.ticket_price === 0 ? t('free') : `CHF ${event.ticket_price}`}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-[11px] font-bold text-vibe-text-secondary uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 opacity-60 text-vibe-purple" />
                    {format(new Date(event.starts_at), 'EEE d MMM', { locale: dateLocale })}
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                    <Clock className="w-3.5 h-3.5 opacity-60 text-vibe-pink" />
                    {format(new Date(event.starts_at), 'HH:mm', { locale: dateLocale })}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      
      {filteredEvents.length === 0 && (
        <EmptyState 
          icon={Search}
          title={t('noEvents')}
          description={t('noEventsFound')}
          actionLabel={t('resetFilters')}
          onAction={() => {
            setActiveTimeFilter('all');
            setActiveGenreFilter('all');
          }}
        />
      )}

      <CreateEvent 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </>
  );
}
