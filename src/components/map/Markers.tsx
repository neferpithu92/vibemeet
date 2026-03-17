'use client';

import { Marker } from 'react-map-gl/mapbox';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

interface MarkerProps {
  longitude: number;
  latitude: number;
  onClick?: () => void;
  isActive?: boolean;
}

/**
 * Marker per le Venue (locali) sulla mappa.
 */
export function VenueMarker({ longitude, latitude, onClick, isActive }: MarkerProps) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button 
        className={cn(
          "relative group transition-all duration-300",
          isActive ? "scale-125 z-10" : "hover:scale-110"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300",
          isActive 
            ? "bg-vibe-cyan shadow-cyan-500/20" 
            : "bg-vibe-dark/80 backdrop-blur-md border border-white/20 group-hover:border-vibe-cyan/50"
        )}>
          <span className="text-xl">🏢</span>
        </div>
        
        {/* Indicatore sotto */}
        <div className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b transition-all duration-300",
          isActive 
            ? "bg-vibe-cyan border-vibe-cyan" 
            : "bg-vibe-dark/80 border-white/20 group-hover:border-vibe-cyan/50"
        )} />
      </button>
    </Marker>
  );
}

/**
 * Marker per gli Eventi sulla mappa.
 */
export function EventMarker({ longitude, latitude, onClick, isActive }: MarkerProps & { isLive?: boolean }) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button 
        className={cn(
          "relative group transition-all duration-300",
          isActive ? "scale-125 z-10" : "hover:scale-110"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 overflow-hidden",
          isActive 
            ? "bg-vibe-purple shadow-purple-500/20" 
            : "bg-vibe-dark/80 backdrop-blur-md border border-white/20 group-hover:border-vibe-purple/50"
        )}>
          {/* Sfondo gradiente dinamico per eventi */}
          <div className="absolute inset-0 bg-vibe-gradient opacity-20 group-hover:opacity-40 transition-opacity" />
          <span className="text-2xl relative z-10">🎉</span>
          
          {/* Badge LIVE pulsante */}
          <div className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibe-pink opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-vibe-pink"></span>
          </div>
        </div>
        
        {/* Indicatore sotto */}
        <div className={cn(
          "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b transition-all duration-300",
          isActive 
            ? "bg-vibe-purple border-vibe-purple" 
            : "bg-vibe-dark/80 border-white/20 group-hover:border-vibe-purple/50"
        )} />
      </button>
    </Marker>
  );
}
/**
 * Marker per le Storie (live) sulla mappa.
 */
export function StoryMarker({ longitude, latitude, onClick, isActive, avatarUrl, username }: MarkerProps & { avatarUrl?: string, username?: string }) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button 
        className={cn(
          "relative group transition-all duration-300",
          isActive ? "scale-125 z-20" : "hover:scale-110"
        )}
      >
        <div className={cn(
          "w-12 h-12 rounded-full p-[2px] shadow-lg transition-all duration-300",
          isActive ? "bg-vibe-pink scale-110" : "story-ring"
        )}>
          <div className="w-full h-full rounded-full border-2 border-vibe-dark overflow-hidden bg-vibe-surface">
            {avatarUrl ? (
              <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                {username ? username[0].toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </div>
        
        {/* Glow effetto */}
        <div className="absolute inset-0 rounded-full glow-pink opacity-0 group-hover:opacity-40 transition-opacity" />
      </button>
    </Marker>
  );
}

/**
 * Marker per gli Utenti Vicini (Nearby People).
 * Visualizza l'avatar dell'utente con un effetto pulsante.
 */
export function PresenceMarker({ 
  longitude, 
  latitude, 
  avatarUrl, 
  username,
  onClick 
}: { 
  longitude: number; 
  latitude: number; 
  avatarUrl?: string; 
  username?: string;
  onClick?: () => void;
}) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <div className="group relative cursor-pointer">
        {/* Effetto Ping / Aura */}
        <div className="absolute inset-0 bg-vibe-cyan/40 rounded-full animate-ping scale-150" />
        
        {/* Contenitore Avatar */}
        <div className="relative z-10 p-0.5 rounded-full bg-vibe-cyan shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-white/20">
          <Avatar 
            size="xs" 
            src={avatarUrl} 
            fallback={username?.[0] || 'U'} 
            className="border-none"
          />
        </div>

        {/* Username Tooltip */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-vibe-dark/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-vibe-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          <span className="text-[10px] font-bold text-vibe-cyan">@{username}</span>
        </div>
      </div>
    </Marker>
  );
}
