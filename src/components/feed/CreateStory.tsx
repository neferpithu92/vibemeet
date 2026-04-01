'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';
import CameraCapture from '@/components/camera/CameraCapture';
import { createClient } from '@/lib/supabase/client';
import { Camera, Upload } from 'lucide-react';

interface CreateStoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateStory({ isOpen, onClose, onSuccess }: CreateStoryProps) {
  const t = useTranslations('stories');
  const { showToast } = useToast();
  const supabase = createClient();
  const [isInserting, setIsInserting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleUploadComplete = async (url: string) => {
    setIsInserting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('error'));

      let locationWkt = null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
           navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        locationWkt = `POINT(${position.coords.longitude} ${position.coords.latitude})`;
      } catch (locErr) {
        console.warn('Story location skipped:', locErr);
      }

      const { error } = await supabase
        .from('stories')
        .insert({
          author_id: user.id,
          media_url: url,
          entity_type: 'user',
          location: locationWkt,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      showToast(t('success'), 'success', '📱');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t('error'), 'error');
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
        <div className="space-y-6">
          <p className="text-sm text-vibe-text-secondary">
            {t('subtitle')}
          </p>
          
          {isInserting ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-vibe-purple animate-pulse">{t('finalizing')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                variant="primary" 
                className="w-full h-16 flex items-center justify-center gap-3 text-lg"
                onClick={() => setIsCameraOpen(true)}
              >
                <Camera className="w-6 h-6" />
                Apri Fotocamera
              </Button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                  <span className="bg-vibe-dark px-2 text-vibe-text-secondary">Oppure carica</span>
                </div>
              </div>

              <MediaUpload 
                bucket="stories" 
                aspectRatio="video"
                onUploadComplete={handleUploadComplete} 
                label={t('uploadLabel')}
              />
            </div>
          )}
        </div>
      </Modal>

      {isCameraOpen && (
        <CameraCapture
          mode="both"
          onClose={() => setIsCameraOpen(false)}
          onCapture={(url) => {
            setIsCameraOpen(false);
            handleUploadComplete(url);
          }}
        />
      )}
    </>
  );
}
