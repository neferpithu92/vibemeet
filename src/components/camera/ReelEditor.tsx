'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ReelEditorProps {
  videoUrl: string;
  onConfirm: (result: ReelResult) => void;
  onBack: () => void;
  isUploading?: boolean;
}

export interface ReelResult {
  url: string;
  caption: string;
  hashtags: string[];
  coverTime: number;
  speed: number;
  isMuted: boolean;
  trimStart: number;
  trimEnd: number;
}

const SPEED_OPTIONS = [0.5, 1, 1.5, 2, 3];
const MAX_REEL_DURATION = 90; // seconds

const HASHTAG_SUGGESTIONS = [
  '#vibe', '#reel', '#trending', '#viral', '#music',
  '#dance', '#mood', '#aesthetic', '#nightlife', '#events',
];

export default function ReelEditor({ videoUrl, onConfirm, onBack, isUploading = false }: ReelEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(MAX_REEL_DURATION);
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [coverTime, setCoverTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<'timeline' | 'speed' | 'cover' | 'caption'>('timeline');
  const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);

  // Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => {
      const d = Math.min(video.duration, MAX_REEL_DURATION);
      setDuration(d);
      setTrimEnd(d);
      video.playbackRate = speed;
    };
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  // Update time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Loop within trim
      if (video.currentTime >= trimEnd || video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [trimStart, trimEnd]);

  // Apply speed
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSetCoverTime = () => {
    if (videoRef.current) {
      setCoverTime(videoRef.current.currentTime);
    }
  };

  // Timeline drag for trim handles
  const getTimelineX = (clientX: number): number => {
    const tl = timelineRef.current;
    if (!tl || duration === 0) return 0;
    const rect = tl.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const handleTimelinePointerDown = (e: React.PointerEvent, handle: 'start' | 'end') => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingTrim(handle);
  };

  const handleTimelinePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingTrim) return;
    const t = getTimelineX(e.clientX);
    if (isDraggingTrim === 'start') {
      setTrimStart(Math.min(t, trimEnd - 1));
    } else {
      setTrimEnd(Math.max(t, trimStart + 1));
    }
  }, [isDraggingTrim, trimStart, trimEnd, duration]);

  const handleTimelinePointerUp = () => setIsDraggingTrim(null);

  const addHashtag = (tag: string) => {
    const cleaned = tag.startsWith('#') ? tag : `#${tag}`;
    if (!hashtags.includes(cleaned)) setHashtags(prev => [...prev, cleaned]);
  };

  const trimPercent = (t: number) => duration > 0 ? (t / duration) * 100 : 0;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimDuration = trimEnd - trimStart;

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-white p-2">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-white font-bold text-base">Editor Reel</span>
        <button
          onClick={() => onConfirm({ url: videoUrl, caption, hashtags, coverTime, speed, isMuted, trimStart, trimEnd })}
          disabled={isUploading}
          className="px-4 py-1.5 rounded-full text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
        >
          {isUploading ? '…' : 'Pubblica'}
        </button>
      </div>

      {/* ── Video Preview ── */}
      <div
        className="relative bg-black flex-shrink-0 flex items-center justify-center"
        style={{ height: '45vh' }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-auto object-contain"
          autoPlay
          loop
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Play/Pause tap */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          {!isPlaying && (
            <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </button>

        {/* Speed badge */}
        {speed !== 1 && (
          <div className="absolute top-3 right-3 bg-black/70 rounded-full px-2.5 py-1 text-white text-xs font-bold backdrop-blur-sm">
            {speed}x
          </div>
        )}

        {/* Mute badge */}
        <button
          onClick={() => setIsMuted(m => !m)}
          className="absolute bottom-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm"
        >
          {isMuted ? (
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
              <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
            </svg>
          ) : (
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex bg-[#111] border-b border-white/10">
        {([
          { key: 'timeline', label: '✂️ Taglia' },
          { key: 'speed', label: '⚡ Velocità' },
          { key: 'cover', label: '🖼️ Cover' },
          { key: 'caption', label: '✏️ Testo' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              activeSection === key ? 'text-white border-b-2 border-purple-500' : 'text-white/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Section Content ── */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">

        {/* Timeline / Trim */}
        {activeSection === 'timeline' && (
          <div className="p-5 space-y-4">
            <div className="flex justify-between text-xs text-white/40">
              <span>{trimStart.toFixed(1)}s</span>
              <span className="text-purple-400 font-bold">{trimDuration.toFixed(1)}s selezionati</span>
              <span>{duration.toFixed(1)}s totale</span>
            </div>

            {/* Timeline bar */}
            <div
              ref={timelineRef}
              className="relative h-12 bg-white/10 rounded-xl overflow-visible cursor-pointer"
              onPointerMove={handleTimelinePointerMove}
              onPointerUp={handleTimelinePointerUp}
            >
              {/* Selected region */}
              <div
                className="absolute top-0 h-full bg-purple-500/30 border-y border-purple-500"
                style={{
                  left: `${trimPercent(trimStart)}%`,
                  width: `${trimPercent(trimEnd) - trimPercent(trimStart)}%`,
                }}
              />

              {/* Current position */}
              <div
                className="absolute top-0 h-full w-0.5 bg-white"
                style={{ left: `${currentPercent}%` }}
              />

              {/* Start handle */}
              <div
                className="absolute top-0 h-full w-4 -ml-2 cursor-col-resize flex items-center justify-center"
                style={{ left: `${trimPercent(trimStart)}%` }}
                onPointerDown={e => handleTimelinePointerDown(e, 'start')}
              >
                <div className="w-1 h-8 bg-white rounded-full shadow-lg" />
              </div>

              {/* End handle */}
              <div
                className="absolute top-0 h-full w-4 -ml-2 cursor-col-resize flex items-center justify-center"
                style={{ left: `${trimPercent(trimEnd)}%` }}
                onPointerDown={e => handleTimelinePointerDown(e, 'end')}
              >
                <div className="w-1 h-8 bg-white rounded-full shadow-lg" />
              </div>
            </div>

            <p className="text-white/30 text-xs text-center">
              Trascina le maniglie per tagliare il video · max {MAX_REEL_DURATION}s
            </p>
          </div>
        )}

        {/* Speed */}
        {activeSection === 'speed' && (
          <div className="p-5 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider text-center">Velocità di riproduzione</p>
            <div className="flex gap-3 justify-center">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`w-14 h-14 rounded-2xl text-sm font-bold border-2 transition-all ${
                    speed === s
                      ? 'border-purple-500 bg-purple-500/20 text-white scale-110'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
            <p className="text-white/30 text-xs text-center">
              {speed < 1 ? 'Rallentatore' : speed === 1 ? 'Velocità normale' : `${speed}x più veloce`}
            </p>
          </div>
        )}

        {/* Cover Frame */}
        {activeSection === 'cover' && (
          <div className="p-5 space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider text-center">
              Scegli il frame di copertina
            </p>
            <p className="text-white/60 text-sm text-center">
              Metti in pausa il video sul frame che vuoi come cover, poi premi il pulsante.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
              >
                {isPlaying ? (
                  <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleSetCoverTime}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
              >
                📌 Imposta frame ({currentTime.toFixed(1)}s)
              </button>
            </div>
            {coverTime > 0 && (
              <p className="text-purple-400 text-xs text-center">
                ✓ Cover impostata a {coverTime.toFixed(1)}s
              </p>
            )}
          </div>
        )}

        {/* Caption */}
        {activeSection === 'caption' && (
          <div className="p-4 space-y-4">
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Aggiungi una didascalia al tuo Reel…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500 resize-none"
              maxLength={2200}
            />
            <div className="text-right text-white/30 text-xs">{caption.length}/2200</div>

            <p className="text-white/40 text-xs uppercase tracking-wider">Hashtag</p>
            <div className="flex flex-wrap gap-2">
              {HASHTAG_SUGGESTIONS.map(tag => (
                <button
                  key={tag}
                  onClick={() => addHashtag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    hashtags.includes(tag)
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map(tag => (
                  <span
                    key={tag}
                    onClick={() => setHashtags(h => h.filter(x => x !== tag))}
                    className="px-2 py-0.5 rounded-full text-xs bg-purple-500/30 text-purple-300 border border-purple-500/40 cursor-pointer"
                  >
                    {tag} ✕
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
