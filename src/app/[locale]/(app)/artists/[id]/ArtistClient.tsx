'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CheckCircle, Instagram, ExternalLink, Music, Calendar, Image, Film, Users } from 'lucide-react';
import { useRouter, Link } from '@/lib/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { it, enUS, de, fr } from 'date-fns/locale';
import { useLocale } from 'next-intl';

interface Artist {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  genres?: string[];
  follower_count?: number;
  is_verified?: boolean;
  instagram_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
}

interface Event {
  id: string;
  title: string;
  starts_at: string;
  cover_url?: string;
  venue?: { name: string };
}

interface ArtistClientProps {
  artist: Artist;
  events: Event[];
  isFollowing: boolean;
  currentUserId?: string;
}

type Tab = 'bio' | 'events' | 'music' | 'photos' | 'vibes';

export default function ArtistClient({ artist, events, isFollowing: initialFollowing, currentUserId }: ArtistClientProps) {
  const t = useTranslations('artists');
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === 'it' ? it : locale === 'en' ? enUS : locale === 'de' ? de : fr;
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('bio');
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(artist.follower_count || 0);

  const handleFollow = async () => {
    if (!currentUserId) return;
    if (following) {
      setFollowing(false);
      setFollowerCount(c => c - 1);
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: artist.id, following_type: 'artist' });
    } else {
      setFollowing(true);
      setFollowerCount(c => c + 1);
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: artist.id, following_type: 'artist' });
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'bio', label: t('bio'), icon: <Users className="w-4 h-4" /> },
    { id: 'events', label: t('events'), icon: <Calendar className="w-4 h-4" /> },
    { id: 'music', label: t('music'), icon: <Music className="w-4 h-4" /> },
    { id: 'photos', label: t('photos'), icon: <Image className="w-4 h-4" /> },
    { id: 'vibes', label: t('vibes'), icon: <Film className="w-4 h-4" /> },
  ];

  return (
    <div className="page-container">
      {/* Cover */}
      <div className="relative h-56">
        {artist.cover_url ? (
          <img src={artist.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-vibe-purple via-vibe-pink to-vibe-cyan" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-vibe-dark via-transparent to-transparent" />

        <button onClick={() => router.back()} className="absolute top-4 left-4 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Profile section */}
      <div className="px-4 pb-4 -mt-16 relative z-10">
        <div className="flex items-end gap-4 mb-4">
          <div className="w-24 h-24 rounded-full border-4 border-vibe-dark overflow-hidden bg-vibe-surface flex items-center justify-center shrink-0">
            {artist.avatar_url ? (
              <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-vibe-purple">{artist.name[0]}</span>
            )}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{artist.name}</h1>
              {artist.is_verified && <CheckCircle className="w-5 h-5 text-blue-400 fill-blue-400/20" />}
            </div>
            <p className="text-vibe-text-secondary text-sm">{t('followerCount', { count: followerCount })}</p>
          </div>
        </div>

        {/* Genre tags */}
        {artist.genres?.length ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {artist.genres.map(g => (
              <span key={g} className="px-3 py-1 bg-vibe-purple/10 text-vibe-purple text-xs rounded-full border border-vibe-purple/20">
                {g}
              </span>
            ))}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleFollow}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
              following
                ? 'bg-white/10 text-vibe-text-secondary border border-white/10'
                : 'bg-vibe-purple text-white hover:bg-vibe-purple/80'
            }`}
          >
            {following ? t('following') : t('follow')}
          </button>
          {artist.instagram_url && (
            <a href={artist.instagram_url} target="_blank" rel="noopener" className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <Instagram className="w-5 h-5" />
            </a>
          )}
          {artist.spotify_url && (
            <a href={artist.spotify_url} target="_blank" rel="noopener" className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all">
              <Music className="w-5 h-5 text-green-400" />
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/10 mb-6 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-vibe-purple text-vibe-purple'
                  : 'border-transparent text-vibe-text-secondary hover:text-vibe-text'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'bio' && (
          <div className="glass-card p-5 rounded-2xl">
            <p className="text-vibe-text-secondary leading-relaxed text-sm">
              {artist.bio || t('noBio')}
            </p>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center py-12 text-vibe-text-secondary">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{t('noEvents')}</p>
              </div>
            ) : events.map((event, i) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-vibe-purple/20 flex-shrink-0 overflow-hidden">
                    {event.cover_url ? (
                      <img src={event.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🎵</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{event.title}</p>
                    <p className="text-xs text-vibe-text-secondary">
                      {new Date(event.starts_at).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    {event.venue && <p className="text-xs text-vibe-purple">@ {event.venue.name}</p>}
                  </div>
                  <ExternalLink className="w-4 h-4 text-vibe-text-secondary" />
                </motion.div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'music' && (
          <div className="glass-card p-6 rounded-2xl text-center">
            <Music className="w-12 h-12 mx-auto mb-3 text-vibe-text-secondary opacity-50" />
            {artist.spotify_url ? (
              <a href={artist.spotify_url} target="_blank" rel="noopener" className="btn-primary inline-flex items-center gap-2">
                <Music className="w-4 h-4" /> {t('listenOnSpotify')}
              </a>
            ) : (
              <p className="text-vibe-text-secondary text-sm">{t('noMusic')}</p>
            )}
          </div>
        )}

        {(activeTab === 'photos' || activeTab === 'vibes') && (
          <div className="text-center py-12 text-vibe-text-secondary">
            <p className="text-4xl mb-3">{activeTab === 'photos' ? '📷' : '🎬'}</p>
            <p className="text-sm">{activeTab === 'photos' ? t('noPhotos') : t('noVibes')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
