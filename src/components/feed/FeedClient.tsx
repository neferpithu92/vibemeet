'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import CreateStory from './CreateStory';

interface FeedPost {
  id: string;
  caption?: string;
  content?: string;
  url?: string;
  profiles?: any;
}

interface FeedStory {
  id: string;
  media_url: string;
  profiles?: any;
}

interface FeedClientProps {
  initialPosts: FeedPost[];
  stories: FeedStory[];
}

export default function FeedClient({ initialPosts, stories }: FeedClientProps) {
  const [activeTab, setActiveTab] = useState<'perTe' | 'seguiti' | 'tendenze'>('perTe');
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold vibe-gradient-text">Feed</h1>
        <button className="glass-card p-2 hover:bg-white/10 transition-all rounded-xl">
          <svg className="w-5 h-5 text-vibe-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* Story Bar */}
      <div className="flex gap-4 mb-6 overflow-x-auto hide-scrollbar pb-2">
        <button 
          onClick={() => setIsStoryOpen(true)}
          className="flex flex-col items-center gap-1 min-w-fit"
        >
          <div className="relative">
            <Avatar size="lg" fallback="Tu" />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-vibe-purple flex items-center justify-center text-white text-[10px] border-2 border-vibe-dark">
              +
            </div>
          </div>
          <span className="text-[10px] text-vibe-text-secondary truncate max-w-[64px]">La tua</span>
        </button>
        {stories.map((story) => {
          const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
          return (
            <button key={story.id} className="flex flex-col items-center gap-1 min-w-fit">
              <Avatar
                size="lg"
                hasStory={true}
                fallback={profile?.username || 'U'}
                src={story.media_url}
              />
              <span className="text-[10px] text-vibe-text-secondary truncate max-w-[64px]">
                {profile?.username || 'user'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/5">
        {([['perTe', 'Per te'], ['seguiti', 'Seguiti'], ['tendenze', 'Tendenze']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              activeTab === key
                ? 'bg-vibe-purple/20 text-vibe-purple'
                : 'text-vibe-text-secondary hover:text-vibe-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Post Feed */}
      <div className="space-y-4">
        {initialPosts.map((post) => {
          const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
          return (
            <Card key={post.id} hover className="p-4">
              {/* Header post */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar size="md" fallback={profile?.username || 'U'} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{profile?.display_name || profile?.username}</span>
                    <Badge variant="verified">✓</Badge>
                  </div>
                  <p className="text-xs text-vibe-text-secondary">@{profile?.username} · 2h</p>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-vibe-text mb-3 leading-relaxed">{post.caption || post.content}</p>

              {/* Media */}
              {post.url && (
                <div className="w-full h-64 rounded-xl bg-vibe-gradient-subtle mb-3 overflow-hidden">
                  <img src={post.url} alt="Post content" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button className="flex items-center gap-1.5 text-vibe-text-secondary hover:text-vibe-pink transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-xs font-medium">124</span>
                </button>
                <button className="flex items-center gap-1.5 text-vibe-text-secondary hover:text-vibe-cyan transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="text-xs font-medium">23</span>
                </button>
                <button className="text-vibe-text-secondary hover:text-vibe-text transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </Card>
          );
        })}
        {initialPosts.length === 0 && (
          <p className="text-sm text-vibe-text-secondary text-center py-12 bg-white/5 rounded-2xl">
            Nessun post da mostrare. Inizia a seguire qualcuno!
          </p>
        )}
      </div>
      <CreateStory 
        isOpen={isStoryOpen} 
        onClose={() => setIsStoryOpen(false)} 
        onSuccess={() => {
          // In produzione, useremmo router.refresh() 
          // o caricheremmo le storie via API Client-side
        }}
      />
    </div>
  );
}
