'use client';

import { useRouter } from '@/lib/i18n/navigation';

/**
 * Mobile Header — Premium Vibe.
 */
export function MobileHeader() {
  const router = useRouter();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-[40] md:hidden glass-panel px-4 h-14 flex items-center justify-between border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-vibe-gradient flex items-center justify-center shadow-lg shadow-vibe-purple/20 border border-white/10">
          <span className="text-white text-sm font-black italic">V</span>
        </div>
        <h1 className="font-display text-xl font-black vibe-gradient-text tracking-tighter uppercase italic">VIBEMEET</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={() => router.push('/map')}
          className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-2xl tap-bounce border border-white/5 shadow-inner"
        >
           <span className="text-xl">🔍</span>
        </button>
      </div>
    </header>
  );
}
