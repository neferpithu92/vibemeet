'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import StoryViewer, { Story, StoryGroup } from './StoryViewer';

interface Highlight {
  id: string;
  title: string;
  cover_url?: string;
  stories?: Story[];
}

interface StoryHighlightsProps {
  userId: string;
  isOwnProfile?: boolean;
  currentUserId?: string;
}

export default function StoryHighlights({ userId, isOwnProfile, currentUserId }: StoryHighlightsProps) {
  const t = useTranslations('stories');
  const supabase = createClient();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);
  const [longPressHighlight, setLongPressHighlight] = useState<Highlight | null>(null);
  const [loading, setLoading] = useState(true);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchHighlights();
  }, [userId]);

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from('story_highlights')
      .select(`
        *,
        highlight_stories (
          story_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setHighlights(data || []);
    setLoading(false);
  };

  const handleDeleteHighlight = async (id: string) => {
    await supabase.from('story_highlights').delete().eq('id', id);
    setHighlights(h => h.filter(x => x.id !== id));
    setLongPressHighlight(null);
  };

  const handleLongPressStart = (h: Highlight) => {
    longPressTimer.current = setTimeout(() => setLongPressHighlight(h), 600);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const viewHighlightStories = async (h: Highlight) => {
    // Fetch stories in this highlight
    const { data: hs } = await supabase
      .from('highlight_stories')
      .select('story_id')
      .eq('highlight_id', h.id);

    if (!hs?.length) return;
    const storyIds = hs.map(x => x.story_id);

    const { data: stories } = await supabase
      .from('stories')
      .select('*, author:users(username, avatar_url, display_name)')
      .in('id', storyIds);

    if (stories?.length) {
      setViewingHighlight({ ...h, stories });
    }
  };

  if (loading) return (
    <div className="flex gap-4 py-2">
      {[1,2,3].map(i => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="w-16 h-16 rounded-full skeleton" />
          <div className="w-12 h-2 skeleton rounded" />
        </div>
      ))}
    </div>
  );

  if (!highlights.length && !isOwnProfile) return null;

  const viewerGroup: StoryGroup | null = viewingHighlight?.stories?.length ? {
    userId,
    user: { username: userId, avatar_url: undefined },
    stories: viewingHighlight.stories
  } : null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
        {/* Add highlight button for own profile */}
        {isOwnProfile && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center bg-white/5">
              <Plus className="w-6 h-6 text-white/50" />
            </div>
            <span className="text-xs text-vibe-text-secondary truncate max-w-[64px]">{t('addHighlight')}</span>
          </motion.button>
        )}

        {highlights.map((highlight) => (
          <motion.button
            key={highlight.id}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1 shrink-0 relative"
            onTouchStart={() => handleLongPressStart(highlight)}
            onTouchEnd={() => { handleLongPressEnd(); viewHighlightStories(highlight); }}
            onClick={() => viewHighlightStories(highlight)}
          >
            <div className="w-16 h-16 rounded-full border-2 border-vibe-purple/50 overflow-hidden bg-vibe-surface flex items-center justify-center">
              {highlight.cover_url ? (
                <img src={highlight.cover_url} alt={highlight.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">📖</span>
              )}
            </div>
            <span className="text-xs text-vibe-text-secondary truncate max-w-[64px]">{highlight.title}</span>
          </motion.button>
        ))}
      </div>

      {/* Long press context menu */}
      <AnimatePresence>
        {longPressHighlight && isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={() => setLongPressHighlight(null)}
          >
            <div className="glass-card w-full max-w-sm p-4 m-4 space-y-2" onClick={e => e.stopPropagation()}>
              <p className="font-semibold text-center mb-3">{longPressHighlight.title}</p>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-left">
                <Edit2 className="w-4 h-4" /> Modifica
              </button>
              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-left"
                onClick={() => handleDeleteHighlight(longPressHighlight.id)}
              >
                <Trash2 className="w-4 h-4" /> Elimina
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Viewer */}
      {viewerGroup && viewingHighlight?.stories && (
        <StoryViewer
          groups={[viewerGroup]}
          initialGroupIndex={0}
          onClose={() => setViewingHighlight(null)}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}
