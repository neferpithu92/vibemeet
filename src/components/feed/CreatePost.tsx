'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import MediaUpload from '@/components/ui/MediaUpload';
import { useToast } from '@/components/ui/ToastProvider';
import { Button } from '@/components/ui/Button';

interface CreatePostProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Componente per creare un nuovo post nel feed.
 */
export default function CreatePost({ isOpen, onClose, onSuccess }: CreatePostProps) {
  const [caption, setCaption] = useState('');
  const [isReadyToUpload, setIsReadyToUpload] = useState(false);
  const { showToast } = useToast();

  const handleUploadComplete = () => {
    showToast('Post pubblicato! 🚀', 'success', '✨');
    setCaption('');
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crea un Post">
      <div className="space-y-6">
        <textarea
          placeholder="Cosa sta succedendo? ✨"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="input-field min-h-[120px] resize-none text-sm"
        />
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-vibe-text-secondary uppercase">Aggiungi Media</label>
          <MediaUpload 
            bucket="media" 
            onUploadComplete={handleUploadComplete} 
            label="Trascina qui la tua foto o video"
          />
        </div>

        <p className="text-[10px] text-vibe-text-secondary text-center">
          Il tuo post sarà visibile a tutti nel feed globale.
        </p>
      </div>
    </Modal>
  );
}
