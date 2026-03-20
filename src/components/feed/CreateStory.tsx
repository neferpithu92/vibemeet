'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';

interface CreateStoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Componente per creare una nuova storia (24h).
 */
export default function CreateStory({ isOpen, onClose, onSuccess }: CreateStoryProps) {
  const { showToast } = useToast();

  const handleUploadComplete = (url: string) => {
    showToast('Storia creata con successo! ✨', 'success', '📱');
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crea una Storia">
      <div className="space-y-6">
        <p className="text-sm text-vibe-text-secondary">
          Condividi un momento live! Le storie scompaiono dopo 24 ore e sono visibili sulla mappa.
        </p>
        
        <MediaUpload 
          bucket="stories" 
          aspectRatio="video"
          onUploadComplete={handleUploadComplete} 
          label="Scegli una foto o video verticale"
        />
      </div>
    </Modal>
  );
}
