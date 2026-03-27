'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { useTranslations } from 'next-intl';

export function MutualFriends({ targetId }: { targetId: string }) {
  const t = useTranslations('social');
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchMutuals() {
      const { data, error } = await fetch(`/api/social/friends?type=mutual&target_id=${targetId}`).then(res => res.json());
      if (!error && Array.isArray(data)) {
        setMutuals(data);
      }
      setLoading(false);
    }
    if (targetId) fetchMutuals();
  }, [targetId]);

  if (loading) return <div className="animate-pulse flex space-x-2"><div className="w-8 h-8 rounded-full bg-white/5" /></div>;
  if (mutuals.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
      <h4 className="text-xs font-bold text-vibe-text-secondary uppercase">
        {t('mutualFriends', { fallback: 'Amici in comune' })} ({mutuals.length})
      </h4>
      <div className="flex -space-x-3 overflow-hidden">
        {mutuals.slice(0, 5).map((m, i) => (
          <Avatar 
            key={i} 
            src={m.avatar_url} 
            fallback={m.display_name} 
            size="sm"
            className="border-2 border-vibe-bg shadow-lg"
          />
        ))}
        {mutuals.length > 5 && (
          <div className="w-10 h-10 rounded-full bg-vibe-bg border-2 border-white/10 flex items-center justify-center text-[10px] text-white font-bold">
            +{mutuals.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
