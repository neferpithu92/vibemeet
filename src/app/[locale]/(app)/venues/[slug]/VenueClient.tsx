'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Users, Clock, Star, Wifi, Accessibility, Car, Music, Check, ChevronRight, ExternalLink } from 'lucide-react';
import { useRouter } from '@/lib/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/lib/i18n/navigation';

interface Venue {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  address?: string;
  cover_url?: string;
  logo_url?: string;
  capacity?: number;
  vibe_score?: number;
  instagram_url?: string;
  google_maps_url?: string;
  amenities?: string[];
  opening_hours?: Record<string, string>;
  latitude?: number;
  longitude?: number;
  parking_info?: string;
  is_accessible?: boolean;
  dress_code?: string;
  min_age?: number;
}

interface CheckIn {
  user_id: string;
  created_at: string;
  users: { id: string; username: string; display_name?: string; avatar_url?: string };
}

interface VenueEvent {
  id: string;
  title: string;
  starts_at: string;
  cover_url?: string;
  rsvp_count: number;
  ticket_price?: number;
}

interface Weather {
  temp_c: number;
  rain_pct: number;
  icon: string;
}

interface VenueClientProps {
  venue: Venue;
  currentCrowd: CheckIn[];
  upcomingEvents: VenueEvent[];
  weather: Weather | null;
  currentUserId?: string;
}

const AMENITY_ICONS: Record<string, string> = {
  wifi: '📶', parking: '🅿️', accessible: '♿', bar: '🍸',
  vip: '👑', stage: '🎤', garden: '🌿', smoking: '🚬',
  food: '🍔', coat_check: '🧥', security: '🛡️', ac: '❄️'
};

export default function VenueClient({ venue, currentCrowd, upcomingEvents, weather, currentUserId }: VenueClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'info' | 'events' | 'crowd'>('info');
  const [liveCount, setLiveCount] = useState(currentCrowd.length);
  const [checkedIn, setCheckedIn] = useState(false);

  const crowdPct = venue.capacity ? Math.min((liveCount / venue.capacity) * 100, 100) : null;
  const crowdLevel = crowdPct === null ? null : crowdPct > 80 ? 'full' : crowdPct > 50 ? 'busy' : crowdPct > 20 ? 'moderate' : 'quiet';

  const crowdColors = { full: 'text-red-400', busy: 'text-orange-400', moderate: 'text-amber-400', quiet: 'text-green-400' };
  const crowdLabels = { full: '🔴 Quasi piena', busy: '🟠 Affollata', moderate: '🟡 Moderata', quiet: '🟢 Tranquilla' };

  const handleCheckIn = async () => {
    if (!currentUserId) return;
    setCheckedIn(true);
    setLiveCount(c => c + 1);
    await supabase.from('check_ins').insert({
      user_id: currentUserId,
      venue_id: venue.id,
      created_at: new Date().toISOString()
    }).then(() => {});
  };

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'events', label: `Eventi (${upcomingEvents.length})` },
    { id: 'crowd', label: 'Crowd' }
  ];

  return (
    <div className="page-container">
      {/* Cover */}
      <div className="relative h-64">
        {venue.cover_url ? (
          <img src={venue.cover_url} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vibe-purple via-vibe-pink to-vibe-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark via-transparent to-transparent" />

        <button onClick={() => router.back()} className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white z-10">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Weather badge */}
        {weather && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 text-white">
            <span className="text-lg">{weather.icon}</span>
            <span className="font-bold text-sm">{weather.temp_c}°</span>
            {weather.rain_pct > 30 && <span className="text-xs opacity-80">☂️ {weather.rain_pct}%</span>}
          </div>
        )}
      </div>

      {/* Profile section */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl border-4 border-vibe-dark overflow-hidden bg-vibe-surface flex items-center justify-center shadow-2xl">
            {venue.logo_url ? (
              <img src={venue.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl">🎵</span>
            )}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="font-display text-2xl font-bold">{venue.name}</h1>
            {venue.address && (
              <div className="flex items-center gap-1 text-vibe-text-secondary text-sm mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{venue.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="glass-card p-3 rounded-2xl text-center">
            <p className="font-display text-xl font-bold text-vibe-cyan">{liveCount}</p>
            <p className="text-xs text-vibe-text-secondary">Ora qui</p>
          </div>
          {venue.capacity && (
            <div className="glass-card p-3 rounded-2xl text-center">
              <p className={`font-display text-xl font-bold ${crowdLevel ? crowdColors[crowdLevel] : ''}`}>
                {crowdPct !== null ? `${Math.round(crowdPct)}%` : '--'}
              </p>
              <p className="text-xs text-vibe-text-secondary">Capienza</p>
            </div>
          )}
          <div className="glass-card p-3 rounded-2xl text-center">
            <p className="font-display text-xl font-bold text-amber-400">
              {venue.vibe_score ? venue.vibe_score.toFixed(1) : '--'}
            </p>
            <p className="text-xs text-vibe-text-secondary">Vibe Score</p>
          </div>
        </div>

        {/* Crowd level indicator */}
        {crowdLevel && crowdPct !== null && (
          <div className="glass-card p-3 rounded-2xl mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-semibold ${crowdColors[crowdLevel]}`}>{crowdLabels[crowdLevel]}</span>
              <span className="text-xs text-vibe-text-secondary">{liveCount}/{venue.capacity} persone</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${crowdLevel === 'full' ? 'bg-red-400' : crowdLevel === 'busy' ? 'bg-orange-400' : crowdLevel === 'moderate' ? 'bg-amber-400' : 'bg-green-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${crowdPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleCheckIn}
            disabled={checkedIn}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              checkedIn ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-vibe-purple text-white hover:bg-vibe-purple/80'
            }`}
          >
            {checkedIn ? '✅ Sei qui!' : '📍 Check-in'}
          </button>
          {venue.google_maps_url && (
            <a href={venue.google_maps_url} target="_blank" rel="noopener"
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
              <MapPin className="w-5 h-5" />
            </a>
          )}
          {venue.instagram_url && (
            <a href={venue.instagram_url} target="_blank" rel="noopener"
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 hover:bg-pink-500/20 transition-all">
              📸
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/10 mb-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id ? 'border-vibe-purple text-vibe-purple' : 'border-transparent text-vibe-text-secondary'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {venue.description && (
              <div className="glass-card p-4 rounded-2xl">
                <p className="text-sm text-vibe-text-secondary leading-relaxed">{venue.description}</p>
              </div>
            )}

            {/* Details grid */}
            <div className="glass-card p-4 rounded-2xl grid grid-cols-2 gap-4">
              {venue.dress_code && (
                <div>
                  <p className="text-xs text-vibe-text-secondary mb-1">Dress Code</p>
                  <p className="font-semibold text-sm">👔 {venue.dress_code}</p>
                </div>
              )}
              {venue.min_age && (
                <div>
                  <p className="text-xs text-vibe-text-secondary mb-1">Età minima</p>
                  <p className="font-semibold text-sm">🔞 {venue.min_age}+</p>
                </div>
              )}
              {venue.capacity && (
                <div>
                  <p className="text-xs text-vibe-text-secondary mb-1">Capienza</p>
                  <p className="font-semibold text-sm">👥 {venue.capacity} persone</p>
                </div>
              )}
              {venue.parking_info && (
                <div>
                  <p className="text-xs text-vibe-text-secondary mb-1">Parcheggio</p>
                  <p className="font-semibold text-sm">🅿️ {venue.parking_info}</p>
                </div>
              )}
            </div>

            {/* Amenities */}
            {venue.amenities?.length ? (
              <div className="glass-card p-4 rounded-2xl">
                <p className="text-xs text-vibe-text-secondary uppercase tracking-wider mb-3">Servizi</p>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map(a => (
                    <span key={a} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm">
                      <span>{AMENITY_ICONS[a] || '✓'}</span>
                      <span className="capitalize">{a.replace(/_/g, ' ')}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Events tab */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-vibe-text-secondary">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nessun evento in programma</p>
              </div>
            ) : upcomingEvents.map((event, i) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-vibe-purple/20 flex-shrink-0">
                    {event.cover_url ? (
                      <img src={event.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{event.title}</p>
                    <p className="text-xs text-vibe-text-secondary">
                      {new Date(event.starts_at).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}
                      {new Date(event.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-vibe-purple">{event.rsvp_count} RSVP</span>
                      <span className="text-xs text-vibe-text-secondary">·</span>
                      <span className="text-xs font-semibold">{event.ticket_price ? `CHF ${event.ticket_price}` : 'Free'}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-vibe-text-secondary" />
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {/* Crowd tab */}
        {activeTab === 'crowd' && (
          <div>
            <p className="text-sm text-vibe-text-secondary mb-4">Persone nelle ultime 4 ore</p>
            <div className="grid grid-cols-4 gap-3">
              {currentCrowd.map((ci, i) => {
                const u = ci.users;
                return (
                  <motion.div key={ci.user_id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-full bg-vibe-surface border border-white/10 overflow-hidden">
                      {u?.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center font-bold text-vibe-purple">
                          {(u?.display_name || u?.username || 'U')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-vibe-text-secondary truncate max-w-[56px]">{u?.username}</span>
                  </motion.div>
                );
              })}
              {currentCrowd.length === 0 && (
                <div className="col-span-4 text-center py-8">
                  <Users className="w-10 h-10 mx-auto mb-2 text-vibe-text-secondary opacity-30" />
                  <p className="text-sm text-vibe-text-secondary">Nessuno qui ora. Sii il primo!</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="h-24" />
      </div>
    </div>
  );
}
