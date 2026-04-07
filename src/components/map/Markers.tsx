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

// ─────────────────────────────────────────────────────────
// VENUE MARKER
// ─────────────────────────────────────────────────────────
export function VenueMarker({ longitude, latitude, onClick, isActive }: MarkerProps) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button
        className={cn(
          'relative group transition-all duration-300',
          isActive ? 'scale-125 z-10' : 'hover:scale-110'
        )}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300',
            isActive
              ? 'bg-vibe-cyan shadow-cyan-500/20'
              : 'bg-vibe-dark/80 backdrop-blur-md border border-white/20 group-hover:border-vibe-cyan/50'
          )}
        >
          <span className="text-xl">🏢</span>
        </div>
        <div
          className={cn(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b transition-all duration-300',
            isActive
              ? 'bg-vibe-cyan border-vibe-cyan'
              : 'bg-vibe-dark/80 border-white/20 group-hover:border-vibe-cyan/50'
          )}
        />
      </button>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────
// EVENT MARKER
// ─────────────────────────────────────────────────────────
export function EventMarker({ longitude, latitude, onClick, isActive }: MarkerProps & { isLive?: boolean }) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button
        className={cn(
          'relative group transition-all duration-300',
          isActive ? 'scale-125 z-10' : 'hover:scale-110'
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 overflow-hidden',
            isActive
              ? 'bg-vibe-purple shadow-purple-500/20'
              : 'bg-vibe-dark/80 backdrop-blur-md border border-white/20 group-hover:border-vibe-purple/50'
          )}
        >
          <div className="absolute inset-0 bg-vibe-gradient opacity-20 group-hover:opacity-40 transition-opacity" />
          <span className="text-2xl relative z-10">🎉</span>
          <div className="absolute top-1 right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-vibe-pink opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-vibe-pink" />
          </div>
        </div>
        <div
          className={cn(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b transition-all duration-300',
            isActive
              ? 'bg-vibe-purple border-vibe-purple'
              : 'bg-vibe-dark/80 border-white/20 group-hover:border-vibe-purple/50'
          )}
        />
      </button>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────
// STORY MARKER
// ─────────────────────────────────────────────────────────
export function StoryMarker({
  longitude,
  latitude,
  onClick,
  isActive,
  avatarUrl,
  username,
}: MarkerProps & { avatarUrl?: string; username?: string }) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button
        className={cn(
          'relative group transition-all duration-300',
          isActive ? 'scale-125 z-20' : 'hover:scale-110'
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-full p-[2px] shadow-lg transition-all duration-300',
            isActive ? 'bg-vibe-pink scale-110' : 'story-ring'
          )}
        >
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
        <div className="absolute inset-0 rounded-full glow-pink opacity-0 group-hover:opacity-40 transition-opacity" />
      </button>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────
// 3D PRESENCE MARKER — Snap Map / Zenly style
// CSS perspective sphere, float animation, shadow, online dot
// ─────────────────────────────────────────────────────────
export function PresenceMarker({
  longitude,
  latitude,
  avatarUrl,
  username,
  onClick,
  isOnline = true,
}: {
  longitude: number;
  latitude: number;
  avatarUrl?: string;
  username?: string;
  onClick?: () => void;
  isOnline?: boolean;
}) {
  const initials = username ? username[0].toUpperCase() : 'V';

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <div
        className="group cursor-pointer select-none"
        style={{ perspective: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
      >
        {/* Keyframe definitions */}
        <style>{`
          @keyframes av3d-float  { 0%,100%{ transform:translateY(0px) rotateX(12deg);  } 50%{ transform:translateY(-7px) rotateX(7deg); } }
          @keyframes av3d-shadow { 0%,100%{ transform:scaleX(1);    opacity:.50; } 50%{ transform:scaleX(.65); opacity:.18; } }
          @keyframes av3d-aura   { 0%,100%{ transform:scale(1);    opacity:.55; } 50%{ transform:scale(1.45); opacity:0; } }
        `}</style>

        {/* Pulsing aura ring */}
        <div style={{
          position: 'absolute',
          top: '-6px', left: '-6px',
          width: '64px', height: '64px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,.42) 0%, transparent 72%)',
          animation: 'av3d-aura 2.8s ease-in-out infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Floating 3D sphere */}
        <div style={{
          width: '52px', height: '52px',
          animation: 'av3d-float 3.2s ease-in-out infinite',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Gradient border */}
          <div
            style={{
              width: '52px', height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #ec4899 100%)',
              padding: '2.5px',
              boxShadow: '0 8px 28px rgba(124,58,237,.65), 0 2px 10px rgba(0,0,0,.4)',
              transform: 'rotateX(12deg)',
              transition: 'transform .25s ease, box-shadow .25s ease',
            }}
          >
            {/* Avatar circle */}
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#1a1025',
              border: '1.5px solid rgba(255,255,255,.12)',
              position: 'relative',
            }}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
                  fontSize: '18px', fontWeight: 800, color: '#fff',
                  fontFamily: 'system-ui,sans-serif',
                }}>
                  {initials}
                </div>
              )}

              {/* Specular shine — top-left highlight */}
              <div style={{
                position: 'absolute', top: '5px', left: '7px',
                width: '14px', height: '9px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,.38)',
                transform: 'rotate(-30deg)',
                filter: 'blur(2px)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>

          {/* Online indicator */}
          {isOnline && (
            <div style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '13px', height: '13px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2.5px solid #0d0a14',
              boxShadow: '0 0 6px #22c55e',
              zIndex: 5,
            }} />
          )}
        </div>

        {/* Projected elliptical shadow */}
        <div style={{
          width: '32px', height: '7px',
          borderRadius: '50%',
          background: 'rgba(0,0,0,.45)',
          filter: 'blur(4px)',
          margin: '2px auto 0',
          zIndex: 1,
          position: 'relative',
          animation: 'av3d-shadow 3.2s ease-in-out infinite',
        }} />

        {/* Username tooltip — visible on hover */}
        <div
          className="group-hover:!opacity-100"
          style={{
            position: 'absolute',
            bottom: '-26px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(13,10,20,.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(124,58,237,.35)',
            borderRadius: '10px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity .18s ease',
            zIndex: 10,
          }}
        >
          <span style={{
            fontSize: '10px', fontWeight: 700,
            color: '#a78bfa', fontFamily: 'system-ui,sans-serif',
          }}>
            @{username}
          </span>
        </div>
      </div>
    </Marker>
  );
}

// ─────────────────────────────────────────────────────────
// MEDIA MARKER
// ─────────────────────────────────────────────────────────
export function MediaMarker({
  longitude,
  latitude,
  mediaUrl,
  thumbnailUrl,
  mediaType,
  onClick,
  isActive,
}: MarkerProps & {
  mediaUrl: string;
  thumbnailUrl?: string;
  mediaType?: string;
}) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom" onClick={onClick}>
      <button
        className={cn(
          'relative group transition-all duration-300',
          isActive ? 'scale-125 z-20' : 'hover:scale-110'
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-xl p-[2px] shadow-xl transition-all duration-300 bg-vibe-dark/40 backdrop-blur-md',
            isActive ? 'bg-vibe-purple scale-110' : 'border border-white/20'
          )}
        >
          <div className="w-full h-full rounded-lg overflow-hidden bg-vibe-surface relative">
            <img
              src={thumbnailUrl || mediaUrl}
              alt="Feed post"
              className="w-full h-full object-cover"
            />
            {mediaType === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="text-white text-[10px]">▶️</span>
              </div>
            )}
          </div>
        </div>
        <div className="absolute inset-0 rounded-xl glow-purple opacity-0 group-hover:opacity-40 transition-opacity" />
        <div
          className={cn(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b transition-all duration-300',
            isActive ? 'bg-vibe-purple border-vibe-purple' : 'bg-vibe-dark/80 border-white/20'
          )}
        />
      </button>
    </Marker>
  );
}
