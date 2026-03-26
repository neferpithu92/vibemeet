'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { HashtagInput } from '@/components/ui/HashtagInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { useCirclesStore } from '@/stores/useCirclesStore';
import { Users, Lock, Eye, Check } from 'lucide-react';


interface CreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Componente per creare un nuovo post nel feed.
 * Ora supporta hashtag e location obbligatoria (Phase 16).
 */
import { createClient } from '@/lib/supabase/client';

export default function CreatePost({ isOpen, onClose, onSuccess }: CreatePostProps) {
  const supabase = createClient();
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string; venue_id?: string } | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'circles' | 'private'>('public');
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  const { circles, fetchCircles } = useCirclesStore();

  React.useEffect(() => {
    if (isOpen) fetchCircles();
  }, [isOpen, fetchCircles]);

  
  const { showToast } = useToast();

  const handleUploadComplete = async (url: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const lng = Number(location?.lng);
      const lat = Number(location?.lat);
      if (isNaN(lng) || isNaN(lat)) throw new Error('Invalid coordinates');

      const { data: media, error } = await supabase.from('media').insert({
        user_id: user.id,
        media_url: url,
        thumbnail_url: url,
        media_type: url.includes('mp4') || url.includes('webm') ? 'video' : 'photo',
        caption: caption,
        location: `POINT(${lng} ${lat})`,
        visibility: visibility,
        allowed_circle_id: visibility === 'circles' ? selectedCircleId : null
      }).select().single();

      if (error) throw error;

      if (media) {
        // Parse hashtags from caption
        const extractHashtags = (text: string) => {
          return (text.match(/#[\w\u00C0-\u024F]+/g) || [])
            .map(tag => tag.slice(1).toLowerCase())
            .slice(0, 30);
        };

        const extractedTags = extractHashtags(caption);
        // Combine manually selected hashtags and extracted ones from caption without duplicates
        const allTags = Array.from(new Set([...extractedTags, ...hashtags]));
        
        for (const tag of allTags) {
          const { data: hashtag } = await supabase
            .from('hashtags')
            .upsert({ tag }, { onConflict: 'tag' })
            .select().single();
          
          if (hashtag) {
            await supabase.from('post_hashtags').insert({
              post_id: media.id,
              post_type: 'media',
              hashtag_id: hashtag.id
            });
          }
        }
      }

      showToast('Post pubblicato! 🚀', 'success', '✨');
      setCaption('');
      setHashtags([]);
      setLocation(null);
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      showToast(e instanceof Error ? e.message : 'Errore durante la pubblicazione', 'error');
    }
  };

  const isFormValid = !!location; // Location is mandatory

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crea un Vibe / Post">
      <div className="space-y-6">
        
        {/* Caption */}
        <div>
          <textarea
            placeholder="Cosa sta succedendo? ✨"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="input-field min-h-[100px] resize-none text-sm mb-2"
          />
          <HashtagInput 
            value={hashtags} 
            onChange={setHashtags} 
            placeholder="Aggiungi hashtag... (es. #zurichnight)"
          />
        </div>

        {/* Visibility Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-vibe-text-secondary uppercase">
            Chi può vedere questo Vibe?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'public', label: 'Pubblico', icon: Eye },
              { id: 'friends', label: 'Amici', icon: Users },
              { id: 'circles', label: 'Circles', icon: Lock },
              { id: 'private', label: 'Privato', icon: Lock },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setVisibility(opt.id as any)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  visibility === opt.id 
                    ? 'bg-vibe-purple/20 border-vibe-purple text-white shadow-[0_0_10px_rgba(157,78,221,0.2)]' 
                    : 'bg-white/5 border-white/10 text-vibe-text-secondary hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <opt.icon className="w-4 h-4" />
                  <span>{opt.label}</span>
                </div>
                {visibility === opt.id && <Check className="w-4 h-4 text-vibe-purple" />}
              </button>
            ))}
          </div>

          {/* Social Circles List (if 'circles' selected) */}
          {visibility === 'circles' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <p className="text-[10px] text-vibe-text-secondary uppercase font-bold px-1">Seleziona un Circle</p>
                {circles.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {circles.map(circle => (
                      <button
                        key={circle.id}
                        onClick={() => setSelectedCircleId(circle.id)}
                        className={`text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          selectedCircleId === circle.id ? 'bg-vibe-purple text-white' : 'hover:bg-white/10 text-vibe-text-secondary'
                        }`}
                      >
                        {circle.name}
                        {selectedCircleId === circle.id && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-vibe-text-secondary italic px-1 py-1">Nessun Circle creato. Creane uno nelle impostazioni.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mandatory Location */}
        <LocationPicker 
          value={location} 
          onChange={setLocation} 
          required 
        />

        {/* Media Upload */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-vibe-text-secondary uppercase">
            Aggiungi Media
          </label>
          <div className={!isFormValid ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
            <MediaUpload 
              bucket="media" 
              onUploadComplete={handleUploadComplete} 
              label="Trascina qui la tua foto o video"
            />
          </div>
          {!isFormValid && (
            <p className="text-xs text-red-400 mt-1">
              📍 Seleziona una location per poter caricare il media.
            </p>
          )}
        </div>

        <p className="text-[10px] text-vibe-text-secondary text-center">
          vibemeet è geo-first. La tua posizione aiuta gli altri a scoprire cosa succede intorno a loro.
        </p>
      </div>
    </Modal>
  );
}
