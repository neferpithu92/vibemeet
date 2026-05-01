'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import MediaEditScreen, { type EditedMedia } from './MediaEditScreen';
import ReelEditor, { type ReelResult } from './ReelEditor';

// ─── Types ────────────────────────────────────────────────────────────────────
type CameraMode = 'photo' | 'video' | 'reel' | 'story';
type FacingMode = 'user' | 'environment';
type FlashMode = 'off' | 'on' | 'auto';
type AspectRatio = '9:16' | '4:3' | '1:1';
type LiveFilter = { name: string; css: string };

const LIVE_FILTERS: LiveFilter[] = [
  { name: 'Normal',   css: 'none' },
  { name: 'Vivid',    css: 'saturate(1.8) contrast(1.1)' },
  { name: 'Noir',     css: 'grayscale(1) contrast(1.2)' },
  { name: 'Warm',     css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
  { name: 'Cool',     css: 'hue-rotate(20deg) saturate(1.2)' },
  { name: 'Fade',     css: 'contrast(0.85) brightness(1.15) saturate(0.8)' },
  { name: 'Dramatic', css: 'contrast(1.5) saturate(1.4) brightness(0.9)' },
  { name: 'Chrome',   css: 'saturate(1.5) contrast(1.3) brightness(1.05)' },
];

const TIMER_OPTIONS = [0, 3, 10];
const MAX_DURATIONS: Record<CameraMode, number> = {
  photo: 0,
  video: 90, // Increased to 90s for standard video
  reel: 90,
  story: 15,
};

export interface CaptureResult {
  url: string;
  type: 'photo' | 'video';
  caption?: string;
  hashtags?: string[];
  filter?: string;
  visibility?: string;
}

interface CameraCaptureProps {
  onCapture: (result: CaptureResult) => void;
  onClose: () => void;
  initialMode?: CameraMode;
}

// ─── Aspect Ratio helpers ─────────────────────────────────────────────────────
function getAspectStyle(ratio: AspectRatio): React.CSSProperties {
  const map: Record<AspectRatio, string> = {
    '9:16': '56.25%',
    '4:3':  '75%',
    '1:1':  '100%',
  };
  return { paddingBottom: map[ratio] };
}

// ─── Arc Progress (SVG) ───────────────────────────────────────────────────────
function ArcProgress({ progress, maxDuration }: { progress: number; maxDuration: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, progress / maxDuration);
  const dash = pct * circ;
  return (
    <svg
      width="96" height="96"
      className="absolute inset-0 pointer-events-none -rotate-90"
      viewBox="0 0 96 96"
    >
      <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle
        cx="48" cy="48" r={r} fill="none"
        stroke={pct > 0.8 ? '#EF4444' : '#EC4899'}
        strokeWidth="3"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.3s linear' }}
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CameraCapture({
  onCapture,
  onClose,
  initialMode = 'photo',
}: CameraCaptureProps) {
  // Camera state
  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);

  const [mode, setMode]               = useState<CameraMode>(initialMode);
  const [facing, setFacing]           = useState<FacingMode>('environment');
  const [flash, setFlash]             = useState<FlashMode>('off');
  const [timer, setTimer]             = useState(0); // seconds: 0=off
  const [timerIndex, setTimerIndex]   = useState(0);
  const [ratio, setRatio]             = useState<AspectRatio>('9:16');
  const [showGrid, setShowGrid]       = useState(false);
  const [zoom, setZoom]               = useState(1);
  const [filter, setFilter]           = useState<LiveFilter>(LIVE_FILTERS[0]);
  const [showFilters, setShowFilters] = useState(false);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime]   = useState(0);

  // Countdown overlay
  const [countdown, setCountdown]     = useState<number | null>(null);

  // Preview & editing
  const [captured, setCaptured]       = useState<{ url: string; type: 'photo' | 'video' } | null>(null);
  const [screen, setScreen]           = useState<'camera' | 'edit' | 'reel'>('camera');

  // Upload
  const [isUploading, setIsUploading] = useState(false);

  // ── Stream management ──────────────────────────────────────────────────────
  const startStream = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width:  { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: mode !== 'photo',
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      
      // Initialize zoom if supported
      const track = s.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities() as any;
        if (capabilities.zoom) {
          try {
            await track.applyConstraints({ advanced: [{ zoom: 1 } as any] });
            setZoom(1);
          } catch (e) {
            console.warn('[Camera] Zoom constraint failed:', e);
          }
        }
      }
    } catch (err) {
      console.error('[Camera] stream error:', err);
    }
  }, [facing, mode]);

  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [facing]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const applyZoom = useCallback(async (z: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: z } as any] });
    } catch {
      // fallback: CSS scale
      if (videoRef.current) {
        videoRef.current.style.transform = `${facing === 'user' ? 'scaleX(-1) ' : ''}scale(${z})`;
      }
    }
    setZoom(z);
  }, [facing]);

  // Pinch-to-zoom
  const lastPinchRef = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchRef.current = Math.hypot(dx, dy);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist - lastPinchRef.current;
      lastPinchRef.current = dist;
      const newZoom = Math.max(1, Math.min(5, zoom + delta * 0.01));
      applyZoom(newZoom);
    }
  };

  // ── Flash / torch ─────────────────────────────────────────────────────────
  const cycleFlash = () => {
    setFlash(f => f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off');
  };
  const getFlashIcon = () => flash === 'off' ? '⚡️' : flash === 'on' ? '🔦' : '⚡A';

  // ── Timer cycling ─────────────────────────────────────────────────────────
  const cycleTimer = () => {
    const next = (timerIndex + 1) % TIMER_OPTIONS.length;
    setTimerIndex(next);
    setTimer(TIMER_OPTIONS[next]);
  };

  // ── Countdown then action ─────────────────────────────────────────────────
  const withCountdown = (action: () => void) => {
    if (timer === 0) { action(); return; }
    let t = timer;
    setCountdown(t);
    countdownRef.current = setInterval(() => {
      t -= 1;
      if (t <= 0) {
        clearInterval(countdownRef.current!);
        setCountdown(null);
        action();
      } else {
        setCountdown(t);
      }
    }, 1000);
  };

  // ── Take photo ────────────────────────────────────────────────────────────
  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    
    // Use video stream dimensions for better quality
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    // Apply filters to canvas if any
    if (filter.css !== 'none') {
      ctx.filter = filter.css;
    }
    
    ctx.drawImage(video, 0, 0);
    const url = canvas.toDataURL('image/jpeg', 0.95);
    setCaptured({ url, type: 'photo' });
    setScreen('edit');
  }, [facing, filter]);

  const handleShutterPhotoClick = () => {
    if (isRecording) return;
    withCountdown(takePhoto);
  };

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url  = URL.createObjectURL(blob);
      setCaptured({ url, type: 'video' });
      setScreen(mode === 'reel' ? 'reel' : 'edit');
    };
    recorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
    setRecordTime(0);
    const max = MAX_DURATIONS[mode];
    timerRef.current = setInterval(() => {
      setRecordTime(prev => {
        if (prev + 1 >= max) {
          stopRecording();
          return max;
        }
        return prev + 1;
      });
    }, 1000);
  }, [mode]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // ── Hold shutter logic ────────────────────────────────────────────────────
  const handleShutterDown = () => {
    if (mode === 'photo' || isRecording) return;
    holdTimerRef.current = setTimeout(() => {
      withCountdown(() => startRecording());
    }, 200);
  };
  const handleShutterUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isRecording) stopRecording();
  };

  // ── Flip camera ───────────────────────────────────────────────────────────
  const [isFlipping, setIsFlipping] = useState(false);
  const flipCamera = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setFacing(f => f === 'user' ? 'environment' : 'user');
      setIsFlipping(false);
    }, 300);
  };

  // ── Gallery picker ────────────────────────────────────────────────────────
  const galleryRef = useRef<HTMLInputElement>(null);
  const pickFromGallery = () => galleryRef.current?.click();
  const onGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type: 'photo' | 'video' = file.type.startsWith('video') ? 'video' : 'photo';
    setCaptured({ url, type });
    setScreen(type === 'video' && mode === 'reel' ? 'reel' : 'edit');
    e.target.value = '';
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const uploadMedia = async (url: string, type: 'photo' | 'video'): Promise<string> => {
    const res   = await fetch(url);
    const blob  = await res.blob();
    const ext   = type === 'photo' ? 'jpg' : 'webm';
    const name  = `${Date.now()}.${ext}`;
    const form  = new FormData();
    form.append('file', blob, name);
    form.append('bucket', 'media');
    const r     = await fetch('/api/media/upload', { method: 'POST', body: form });
    const data  = await r.json();
    return data.url || data.data?.url || url;
  };

  const handleEditConfirm = async (media: EditedMedia) => {
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadMedia(media.url, media.type);
      onCapture({
        url: uploadedUrl,
        type: media.type,
        caption: media.caption,
        hashtags: media.hashtags,
        filter: media.filter,
        visibility: media.visibility,
      });
    } catch (err) {
      console.error('[Camera] upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReelConfirm = async (reel: ReelResult) => {
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadMedia(reel.url, 'video');
      onCapture({
        url: uploadedUrl,
        type: 'video',
        caption: reel.caption,
        hashtags: reel.hashtags,
      });
    } catch (err) {
      console.error('[Camera] reel upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Sub-screens ───────────────────────────────────────────────────────────
  if (screen === 'edit' && captured) {
    return (
      <MediaEditScreen
        mediaUrl={captured.url}
        mediaType={captured.type}
        onConfirm={handleEditConfirm}
        onBack={() => { setCaptured(null); setScreen('camera'); }}
        isUploading={isUploading}
      />
    );
  }
  if (screen === 'reel' && captured) {
    return (
      <ReelEditor
        videoUrl={captured.url}
        onConfirm={handleReelConfirm}
        onBack={() => { setCaptured(null); setScreen('camera'); }}
        isUploading={isUploading}
      />
    );
  }

  const maxDuration = MAX_DURATIONS[mode];

  // ── Render camera ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col select-none">
      {/* ─ Top Controls ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2 z-10">
        {/* Close */}
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white"
          aria-label="Chiudi fotocamera"
        >
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Center: flash + timer + grid + ratio */}
        <div className="flex items-center gap-4">
          <button onClick={cycleFlash} className="text-xl" aria-label="Flash">
            {getFlashIcon()}
          </button>
          <button onClick={cycleTimer} className="text-white text-sm font-bold" aria-label="Timer">
            {timer === 0 ? '⏱' : `${timer}s`}
          </button>
          <button
            onClick={() => setShowGrid(g => !g)}
            className={`text-xs font-bold px-2 py-1 rounded-full border ${showGrid ? 'border-yellow-400 text-yellow-400' : 'border-white/30 text-white/60'}`}
          >
            ⊞
          </button>
          <button
            onClick={() => setRatio(r => r === '9:16' ? '4:3' : r === '4:3' ? '1:1' : '9:16')}
            className="text-white/60 text-xs font-mono border border-white/20 px-2 py-0.5 rounded"
          >
            {ratio}
          </button>
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`w-10 h-10 flex items-center justify-center text-lg rounded-full border ${showFilters ? 'border-purple-400 text-purple-300' : 'border-white/20 text-white/60'}`}
        >
          ✨
        </button>
      </div>

      {/* ─ Viewfinder ──────────────────────────────────────────────── */}
      <div
        className="relative flex-1 overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: facing === 'user' ? 'scaleX(-1)' : 'none',
            filter: filter.css !== 'none' ? filter.css : undefined,
            transition: 'filter 0.2s ease',
          }}
        />

        {/* Grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            {[1, 2].map(i => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${(i / 3) * 100}%` }} />
            ))}
            {[1, 2].map(i => (
              <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-white/20" style={{ top: `${(i / 3) * 100}%` }} />
            ))}
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-white font-black"
              style={{ fontSize: '20vw', textShadow: '0 0 40px rgba(124,58,237,0.8)', lineHeight: 1 }}
            >
              {countdown}
            </span>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-mono text-sm tabular-nums">
              {String(Math.floor(recordTime / 60)).padStart(2, '0')}:{String(recordTime % 60).padStart(2, '0')}
            </span>
            {maxDuration > 0 && (
              <span className="text-white/40 text-xs">/ {maxDuration}s</span>
            )}
          </div>
        )}

        {/* Zoom indicator */}
        {zoom > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="text-white font-mono text-sm">{zoom.toFixed(1)}×</span>
          </div>
        )}

        {/* Filters strip (live) */}
        {showFilters && (
          <div
            className="absolute bottom-0 left-0 right-0 flex gap-2 px-4 pb-3 pt-2 overflow-x-auto hide-scrollbar"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
          >
            {LIVE_FILTERS.map(f => (
              <button
                key={f.name}
                onClick={() => setFilter(f)}
                className="flex-shrink-0 flex flex-col items-center gap-1"
              >
                <div
                  className={`w-12 h-16 rounded-lg overflow-hidden border-2 ${filter.name === f.name ? 'border-purple-400' : 'border-white/20'}`}
                  style={{ background: 'linear-gradient(135deg,#3b0764,#831843)', filter: f.css !== 'none' ? f.css : undefined }}
                />
                <span className={`text-xs ${filter.name === f.name ? 'text-purple-300' : 'text-white/50'}`}>{f.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─ Zoom Slider ──────────────────────────────────────────────── */}
      {!showFilters && (
        <div className="flex items-center gap-3 px-8 py-2 bg-black">
          <span className="text-white/40 text-xs">1×</span>
          <input
            type="range" min={1} max={5} step={0.1} value={zoom}
            onChange={e => applyZoom(Number(e.target.value))}
            className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #7C3AED ${((zoom - 1) / 4) * 100}%, rgba(255,255,255,0.1) ${((zoom - 1) / 4) * 100}%)`,
            }}
          />
          <span className="text-white/40 text-xs">5×</span>
          <span className="text-purple-400 text-xs font-mono w-8">{zoom.toFixed(1)}×</span>
        </div>
      )}

      {/* ─ Mode Switcher ────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-6 bg-black py-3">
        {(['photo', 'video', 'reel', 'story'] as CameraMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`text-sm font-bold uppercase tracking-widest transition-all ${
              mode === m ? 'text-yellow-300 scale-110' : 'text-white/30'
            }`}
          >
            {m === 'photo' ? 'FOTO' : m === 'video' ? 'VIDEO' : m === 'reel' ? 'REEL' : 'STORIA'}
          </button>
        ))}
      </div>

      {/* ─ Shutter Row ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 pb-safe pb-6 bg-black">
        {/* Gallery */}
        <button
          onClick={pickFromGallery}
          className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-2xl"
          aria-label="Galleria"
        >
          🖼️
        </button>

        {/* Shutter */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {isRecording && (
            <ArcProgress progress={recordTime} maxDuration={maxDuration} />
          )}
          <button
            onMouseDown={mode !== 'photo' ? handleShutterDown : undefined}
            onMouseUp={mode !== 'photo' ? handleShutterUp : undefined}
            onTouchStart={mode !== 'photo' ? handleShutterDown : undefined}
            onTouchEnd={mode !== 'photo' ? handleShutterUp : undefined}
            onClick={mode === 'photo' ? handleShutterPhotoClick : undefined}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 ${
              isRecording ? 'bg-red-500' : 'bg-white/10'
            }`}
            aria-label={isRecording ? 'Ferma registrazione' : 'Scatta'}
          >
            {isRecording ? (
              <div className="w-7 h-7 bg-white rounded-md" />
            ) : mode === 'photo' ? (
              <div className="w-16 h-16 rounded-full bg-white" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-white" />
            )}
          </button>
        </div>

        {/* Flip */}
        <button
          onClick={flipCamera}
          className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl"
          style={{
            transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
            transition: 'transform 0.3s ease',
          }}
          aria-label="Capovolgi fotocamera"
        >
          🔄
        </button>
      </div>

      {/* ─ Hidden gallery input ─ */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={onGalleryChange}
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
