'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * UsageTracker - Silently tracks app usage time for the user.
 * Increments seconds and syncs to Supabase.
 */
export function UsageTracker() {
  const supabase = createClient();
  const sessionUser = useRef<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function initAndTrack() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      sessionUser.current = user.id;

      // Increment every 30 seconds to balance precision vs writes
      interval = setInterval(async () => {
        if (!sessionUser.current) return;

        try {
          const date = new Date().toISOString().split('T')[0];
          
          // Atomic increment via RPC
          const { error } = await (supabase as any).rpc('increment_usage', { 
            p_user_id: sessionUser.current, 
            p_date: date, 
            p_seconds: 30 
          });

          if (error) throw error;
        } catch (err) {
          console.error('[UsageTracker] Failed to sync usage:', err);
        }
      }, 30000);
    }

    initAndTrack();

    return () => clearInterval(interval);
  }, []);

  return null; // Side-effect only component
}
