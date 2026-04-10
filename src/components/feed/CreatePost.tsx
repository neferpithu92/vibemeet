'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import { HashtagInput } from '@/components/ui/HashtagInput';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { useCirclesStore } from '@/stores/useCirclesStore';
import { Users, Lock, Eye, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMediaUrl?: string;
  initialType?: 'photo' | 'video';
}

export default function CreatePost({ isOpen, onClose, onSuccess, initialMediaUrl, initialType }: CreatePostProps) {
  const t = useTranslations('create');
  const supabase = createClient();
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string; venue_id?: string } | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'circles' | 'private'>('public');
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { circles, fetchCircles } = useCirclesStore();

  React.useEffect(() => {
    if (isOpen) fetchCircles();
  }, [isOpen, fetchCircles]);

  const { showToast } = useToast();

  const savePost = async (url: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const lng = Number(location?.lng);
      const lat = Number(location?.lat);
      if (isNaN(lng) || isNaN(lat)) throw new Error('Invalid coordinates');

      const { data: media, error } = await supabase.from('media').insert({
        user_id: user.id,
        author_id: user.id, // Ensure author_id is set
        url: url, // DB uses 'url' and 'type' in newer schema? Let me check.
        media_url: url,
        thumbnail_url: url,
        media_type: initialType || (url.includes('mp4') || url.includes('webm') ? 'video' : 'photo'),
        type: initialType || (url.includes('mp4') || url.includes('webm') ? 'video' : 'photo'),
        caption: caption,
        location: `POINT(${lng} ${lat})`,
        location_name: location?.name,
        visibility: visibility,
        allowed_circle_id: visibility === 'circles' ? selectedCircleId : null
      }).select().single();

      if (error) throw error;

      if (media) {
        const extractHashtags = (text: string) => {
          return (text.match(/#[\w\u00C0-\u024F]+/g) || [])
            .map(tag => tag.slice(1).toLowerCase())
            .slice(0, 30);
        };

        const extractedTags = extractHashtags(caption);
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

      showToast(t('success'), 'success', '✨');
      setCaption('');
      setHashtags([]);
      setLocation(null);
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      showToast(e instanceof Error ? e.message : t('error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadComplete = (url: string) => savePost(url);
  const handlePublishCaptured = () => initialMediaUrl && savePost(initialMediaUrl);

  const isFormValid = !!location;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <div className="space-y-6">
        <div>
          <textarea
            placeholder={t('captionPlaceholder')}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="input-field min-h-[100px] resize-none text-sm mb-2"
          />
          <HashtagInput 
            value={hashtags} 
            onChange={setHashtags} 
            placeholder={t('hashtagPlaceholder')}
          />
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-vibe-text-secondary uppercase">
            {t('visibilityLabel')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'public', label: t('public'), icon: Eye },
              { id: 'friends', label: t('friends'), icon: Users },
              { id: 'circles', label: t('circles'), icon: Lock },
              { id: 'private', label: t('private'), icon: Lock },
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

          {visibility === 'circles' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <p className="text-[10px] text-vibe-text-secondary uppercase font-bold px-1">{t('selectCircle')}</p>
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
                  <p className="text-xs text-vibe-text-secondary italic px-1 py-1">{t('noCircles')}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <LocationPicker 
          value={location} 
          onChange={setLocation} 
          required 
        />
        <div className="space-y-2">
          {initialMediaUrl ? (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 group">
                {initialType === 'video' ? (
                  <video src={initialMediaUrl} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={initialMediaUrl} className="w-full h-full object-cover" alt="Captured" />
                )}
              </div>
              <Button 
                variant="primary" 
                className="w-full" 
                onClick={handlePublishCaptured}
                disabled={!isFormValid || isSubmitting}
                isLoading={isSubmitting}
              >
                {t('publish')}
              </Button>
            </div>
          ) : (
            <>
              <label className="text-xs font-bold text-vibe-text-secondary uppercase">
                {t('addMedia')}
              </label>
              <div className={!isFormValid ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                <MediaUpload 
                  bucket="media" 
                  onUploadComplete={handleUploadComplete} 
                  label={t('uploadPlaceholder')}
                />
              </div>
            </>
          )}
          {!isFormValid && (
            <p className="text-xs text-red-400 mt-1">
              {t('locationRequired')}
            </p>
          )}
        </div>

        <p className="text-[10px] text-vibe-text-secondary text-center">
          {t('geoFirstNote')}
        </p>
      </div>
    </Modal>
  );
}
