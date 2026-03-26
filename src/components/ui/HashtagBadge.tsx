'use client';

import { Link } from '@/lib/i18n/navigation';

interface HashtagBadgeProps {
  tag: string;
  count?: number;
  size?: 'sm' | 'md';
  trending?: boolean;
}

/**
 * HashtagBadge — Clickable hashtag badge that navigates to /explore/hashtag/[tag]
 */
export function HashtagBadge({ tag, count, size = 'sm', trending = false }: HashtagBadgeProps) {
  return (
    <Link
      href={`/explore/hashtag/${encodeURIComponent(tag)}`}
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold transition-all duration-300
        hover:scale-105 hover:shadow-lg
        ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'}
        ${trending
          ? 'bg-gradient-to-r from-vibe-purple/25 to-vibe-pink/25 text-vibe-pink border border-vibe-pink/20 hover:border-vibe-pink/40'
          : 'bg-vibe-purple/15 text-vibe-purple border border-vibe-purple/10 hover:border-vibe-purple/30'
        }
      `}
    >
      <span>#{tag}</span>
      {trending && (
        <span className="text-[10px]">🔥</span>
      )}
      {count !== undefined && (
        <span className="text-[10px] opacity-70">
          {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
        </span>
      )}
    </Link>
  );
}
