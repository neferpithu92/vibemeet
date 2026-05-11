'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { api, ClientApiError } from '@/hooks/useApi';
import { UserPlus, UserCheck, Clock } from 'lucide-react';

interface FollowButtonProps {
  targetId: string;
  entityType?: 'user' | 'venue' | 'artist';
  initialIsFollowing?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onFollowChange?: (isFollowing: boolean, newCount?: number) => void;
}

export default function FollowButton({ 
  targetId, 
  entityType = 'user', 
  initialIsFollowing = false,
  size = 'md',
  className = '',
  onFollowChange
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false); // per account privati
  const [isInitialized, setIsInitialized] = useState(false);
  const { showToast } = useToast();
  const supabase = createClient();

  // Verifica stato follow reale all'init
  useEffect(() => {
    const checkFollowStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === targetId) {
        setIsInitialized(true);
        return;
      }
      
      const { data } = await (supabase.from('followers') as any)
        .select('follower_id')
        .match({ follower_id: user.id, following_id: targetId, entity_type: entityType })
        .maybeSingle();
      
      setIsFollowing(!!data);

      // Controlla anche se c'è una friendship pending
      if (!data) {
        const { data: friendship } = await (supabase.from('friendships') as any)
          .select('status')
          .match({ requester_id: user.id, addressee_id: targetId })
          .maybeSingle();
        setIsPending(friendship?.status === 'pending');
      }
      
      setIsInitialized(true);
    };
    
    checkFollowStatus();
  }, [targetId, entityType]);

  // Ascolta cambiamenti realtime del follow
  useEffect(() => {
    let channel: any;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      channel = supabase
        .channel(`follow-${user.id}-${targetId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'followers',
          filter: `follower_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT' && (payload.new as any).following_id === targetId) {
            setIsFollowing(true);
            setIsPending(false);
          } else if (payload.eventType === 'DELETE' && (payload.old as any).following_id === targetId) {
            setIsFollowing(false);
          }
        })
        .subscribe();
    };
    
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [targetId]);

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showToast('Devi essere loggato per seguire', 'error', '🔒');
      return;
    }
    if (user.id === targetId) {
      showToast('Non puoi seguire te stesso', 'info');
      return;
    }

    setIsLoading(true);
    const action = isFollowing ? 'unfollow' : 'follow';

    try {
      const result = await api.social.follow(targetId, action, entityType);

      setIsFollowing(result.following);
      setIsPending(result.pending ?? false);

      const emoji = !result.following ? '👋' : (result.pending ? '🕐' : '✨');
      showToast(result.message, 'success', emoji);

      if (onFollowChange) onFollowChange(result.following);
    } catch (err) {
      if (err instanceof ClientApiError) {
        if (err.isRateLimited) {
          showToast('Stai andando troppo veloce! Riprova tra poco.', 'error', '⏱️');
        } else if (err.isUnauthorized) {
          showToast('Sessione scaduta — effettua di nuovo il login', 'error', '🔒');
        } else {
          showToast(err.message, 'error');
        }
      } else {
        showToast('Errore di connessione', 'error');
        console.error('[FollowButton] Error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <Button 
        variant="secondary" 
        size={size}
        className={className}
        disabled
      >
        ...
      </Button>
    );
  }

  if (isPending) {
    return (
      <Button 
        variant="secondary" 
        size={size}
        className={`${className} opacity-70`}
        onClick={handleFollow}
        disabled={isLoading}
      >
        <Clock className="w-4 h-4 mr-1.5" />
        {isLoading ? '...' : 'In attesa'}
      </Button>
    );
  }

  return (
    <Button 
      variant={isFollowing ? 'secondary' : 'primary'} 
      size={size}
      className={className}
      onClick={handleFollow}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : isFollowing ? (
        <UserCheck className="w-4 h-4 mr-1.5" />
      ) : (
        <UserPlus className="w-4 h-4 mr-1.5" />
      )}
      {isLoading ? '...' : isFollowing ? 'Seguito' : 'Segui'}
    </Button>
  );
}
