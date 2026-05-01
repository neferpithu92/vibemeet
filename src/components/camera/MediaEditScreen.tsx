'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type MediaType = 'photo' | 'video';

export interface EditedMedia {
  url: string;
  type: MediaType;
  caption: string;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  location: string;
  tags: string[];
  hashtags: string[];
  visibility: 'public' | 'followers' | 'private';
  aspectRatio: '9:16' | '4:3' | '1:1';
}

interface MediaEditScreenProps {
  mediaUrl: string;
  mediaType: MediaType;
  onConfirm: (media: EditedMedia) => void;
  onBack: () => void;
  isUploading?: boolean;
}

// ─── Filters ─────────────────────────────────────────────────────────────────
const FILTERS = [
  { name: 'Normal',    css: 'none' },
  { name: 'Vivid',     css: 'saturate(1.8) contrast(1.1)' },
  { name: 'Chrome',    css: 'saturate(1.5) contrast(1.3) brightness(1.05)' },
  { name: 'Fade',      css: 'contrast(0.85) brightness(1.15) saturate(0.8)' },
  { name: 'Noir',      css: 'grayscale(1) contrast(1.2)' },
  { name: 'Warm',      css: 'sepia(0.3) saturate(1.3) brightness(1.05)' },
  { name: 'Cool',      css: 'hue-rotate(20deg) saturate(1.2)' },
  { name: 'Dramatic',  css: 'contrast(1.5) saturate(1.4) brightness(0.9)' },
  { name: 'Matte',     css: 'contrast(0.9) saturate(0.85) brightness(1.1) sepia(0.1)' },
];

// ─── Hashtag Suggestions ─────────────────────────────────────────────────────
const HASHTAG_SUGGESTIONS = [
  '#vibemeet', '#events', '#nightlife', '#photography', '#music',
  '#festival', '#party', '#friends', '#good vibes', '#memories',
];

export default function MediaEditScreen({
  mediaUrl,
  mediaType,
  onConfirm,
  onBack,
  isUploading = false,
}: MediaEditScreenProps) {
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust' | 'caption'>('filters');
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [aspectRatio] = useState<'9:16' | '4:3' | '1:1'>('9:16');

  // Computed CSS filter string
  const computedFilter = [
    selectedFilter.css !== 'none' ? selectedFilter.css : '',
    `brightness(${brightness / 100})`,
    `contrast(${contrast / 100})`,
    `saturate(${saturation / 100})`,
  ].filter(Boolean).join(' ');

  const addHashtag = (tag: string) => {
    const cleaned = tag.startsWith('#') ? tag : `#${tag}`;
    if (!hashtags.includes(cleaned)) {
      setHashtags(prev => [...prev, cleaned]);
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(prev => prev.filter(h => h !== tag));
  };

  const handleConfirm = () => {
    onConfirm({
      url: mediaUrl,
      type: mediaType,
      caption,
      filter: computedFilter,
      brightness,
      contrast,
      saturation,
      location,
      tags,
      hashtags,
      visibility,
      aspectRatio,
    });
  };

  const handleCaptionChange = (text: string) => {
    setCaption(text);
    // Auto-detect hashtags
    const matches = text.match(/#\w+/g) || [];
    const newTags = matches.filter(t => !hashtags.includes(t));
    if (newTags.length) {
      setHashtags(prev => [...new Set([...prev, ...newTags])]);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white"
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-white font-semibold text-base">Nuovo post</span>
        <button
          onClick={handleConfirm}
          disabled={isUploading}
          className="px-4 py-1.5 rounded-full text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #EC4899)' }}
        >
          {isUploading ? 'Caricamento…' : 'Avanti →'}
        </button>
      </div>

      {/* ── Media Preview ── */}
      <div className="relative bg-black flex-shrink-0" style={{ height: '42vh' }}>
        {mediaType === 'photo' ? (
          <img
            src={mediaUrl}
            alt="Preview"
            className="w-full h-full object-contain"
            style={{ filter: computedFilter }}
          />
        ) : (
          <video
            src={mediaUrl}
            className="w-full h-full object-contain"
            style={{ filter: computedFilter }}
            autoPlay
            loop
            muted
            playsInline
          />
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex bg-black border-b border-white/10">
        {(['filters', 'adjust', 'caption'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-purple-500'
                : 'text-white/40'
            }`}
          >
            {tab === 'filters' ? '✨ Filtri' : tab === 'adjust' ? '🎛️ Regola' : '✏️ Didascalia'}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto bg-black">
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="flex gap-3 p-4 overflow-x-auto hide-scrollbar">
            {FILTERS.map(f => (
              <button
                key={f.name}
                onClick={() => setSelectedFilter(f)}
                className="flex-shrink-0 flex flex-col items-center gap-2"
              >
                <div
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedFilter.name === f.name
                      ? 'border-purple-500 scale-105'
                      : 'border-white/10'
                  }`}
                >
                  {mediaType === 'photo' ? (
                    <img
                      src={mediaUrl}
                      alt={f.name}
                      className="w-full h-full object-cover"
                      style={{ filter: f.css }}
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-gradient-to-br from-purple-900 to-pink-900"
                      style={{ filter: f.css }}
                    />
                  )}
                </div>
                <span className={`text-xs ${selectedFilter.name === f.name ? 'text-purple-400' : 'text-white/50'}`}>
                  {f.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Adjust Tab */}
        {activeTab === 'adjust' && (
          <div className="p-5 space-y-6">
            {[
              { label: '☀️ Luminosità', value: brightness, set: setBrightness, min: 50, max: 150 },
              { label: '◑ Contrasto',   value: contrast,   set: setContrast,   min: 50, max: 200 },
              { label: '🎨 Saturazione', value: saturation, set: setSaturation, min: 0,  max: 200 },
            ].map(({ label, value, set, min, max }) => (
              <div key={label}>
                <div className="flex justify-between mb-2">
                  <span className="text-white/80 text-sm">{label}</span>
                  <span className="text-purple-400 text-sm font-mono">{value}%</span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={e => set(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #7C3AED ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%)`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-white/20 text-xs">{min}%</span>
                  <button
                    onClick={() => set(100)}
                    className="text-white/30 text-xs hover:text-white/60 transition-colors"
                  >
                    Reset
                  </button>
                  <span className="text-white/20 text-xs">{max}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Caption Tab */}
        {activeTab === 'caption' && (
          <div className="p-4 space-y-4">
            {/* Caption */}
            <div>
              <textarea
                value={caption}
                onChange={e => handleCaptionChange(e.target.value)}
                placeholder="Scrivi una didascalia…"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500 resize-none"
                maxLength={2200}
              />
              <div className="text-right text-white/30 text-xs mt-1">{caption.length}/2200</div>
            </div>

            {/* Hashtag suggestions */}
            <div>
              <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Hashtag suggeriti</p>
              <div className="flex flex-wrap gap-2">
                {HASHTAG_SUGGESTIONS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => addHashtag(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      hashtags.includes(tag)
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Active hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => removeHashtag(tag)}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/30 text-purple-300 border border-purple-500/50 flex items-center gap-1"
                  >
                    {tag} <span className="text-purple-400/60">✕</span>
                  </button>
                ))}
              </div>
            )}

            {/* Location */}
            <div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">📍</span>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Aggiungi posizione"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Visibility */}
            <div>
              <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Visibilità</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'public' as const, icon: '🌍', label: 'Tutti' },
                  { v: 'followers' as const, icon: '👥', label: 'Follower' },
                  { v: 'private' as const, icon: '🔒', label: 'Solo io' },
                ].map(({ v, icon, label }) => (
                  <button
                    key={v}
                    onClick={() => setVisibility(v)}
                    className={`py-2.5 rounded-xl text-xs font-medium flex flex-col items-center gap-1 border transition-all ${
                      visibility === v
                        ? 'bg-purple-500/20 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
