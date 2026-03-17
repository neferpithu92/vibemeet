'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';

interface FollowButtonProps {
  targetId: string;
  entityType: 'user' | 'venue' | 'artist';
  initialIsFollowing: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FollowButton({ 
  targetId, 
  entityType, 
  initialIsFollowing,
  size = 'md',
  className = ''
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleFollow = async () => {
    setIsLoading(true);
    const action = isFollowing ? 'unfollow' : 'follow';

    try {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, entityType, action }),
      });

      if (res.ok) {
        setIsFollowing(!isFollowing);
        showToast(isFollowing ? 'Follow rimosso' : 'Ora segui!', 'success', isFollowing ? '👋' : '✨');
      } else {
        const data = await res.json();
        if (data.error === 'Non autorizzato') {
          showToast('Devi essere loggato per seguire', 'error', '🔒');
        }
      }
    } catch (err) {
      console.error('Follow Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={isFollowing ? 'secondary' : 'primary'} 
      size={size}
      className={className}
      onClick={handleFollow}
      disabled={isLoading}
    >
      {isLoading ? '...' : isFollowing ? 'Seguito' : 'Segui'}
    </Button>
  );
}
