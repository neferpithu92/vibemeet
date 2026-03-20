'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { HashtagInput } from '@/components/ui/HashtagInput';
import { LocationPicker } from '@/components/ui/LocationPicker';

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
  
  const { showToast } = useToast();

  const handleUploadComplete = async (url: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data: media, error } = await supabase.from('media').insert({
        author_id: user.id,
        url: url,
        thumbnail_url: url, // Assuming URL works as thumbnail for images
        type: url.includes('mp4') || url.includes('webm') ? 'video' : 'photo',
        caption: caption,
        location_name: location?.name,
        venue_id: location?.venue_id,
        lat: location?.lat,
        lng: location?.lng
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
    } catch (e) {
      console.error(e);
      showToast('Errore durante la pubblicazione', 'error');
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
