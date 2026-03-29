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

        const date = new Date().toISOString().split('T')[0];
        
        // Use a simple atomic increment via RPC or a raw upsert
        // We assume usage_stats table exists as per Migration 040
        await supabase.rpc('increment_usage', { 
          p_user_id: sessionUser.current, 
          p_date: date, 
          p_seconds: 30 
        });
      }, 30000);
    }

    initAndTrack();

    return () => clearInterval(interval);
  }, []);

  return null; // Side-effect only component
}
