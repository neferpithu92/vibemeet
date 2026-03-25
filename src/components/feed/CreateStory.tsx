'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';

interface CreateStoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Highly reliable story creator (Critical System 6/7/14).
 * Handles immediate DB insertion with location tracking.
 */
export default function CreateStory({ isOpen, onClose, onSuccess }: CreateStoryProps) {
  const { showToast } = useToast();
  const supabase = createClient();
  const [isInserting, setIsInserting] = useState(false);

  const handleUploadComplete = async (url: string) => {
    setIsInserting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get location for the story map (System 7)
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

      showToast('Story shared! ✨', 'success', '📱');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error sharing story', 'error');
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share a Story">
      <div className="space-y-6">
        <p className="text-sm text-vibe-text-secondary">
          Stories disappear after 24 hours and show up instantly on the map! ✨
        </p>
        
        {isInserting ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-12 border-4 border-vibe-purple border-t-transparent rounded-full animate-spin" />
             <p className="font-bold text-vibe-purple animate-pulse">Finalizing your story...</p>
          </div>
        ) : (
          <MediaUpload 
            bucket="stories" 
            aspectRatio="video"
            onUploadComplete={handleUploadComplete} 
            label="Choose a vertical photo or video"
          />
        )}
      </div>
    </Modal>
  );
}
