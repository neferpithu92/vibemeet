'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import MediaUpload from '@/components/ui/MediaUpload';

interface CreateEventProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  venueId?: string;
}

export default function CreateEvent({ isOpen, onClose, onSuccess, venueId }: CreateEventProps) {
  const supabase = createClient();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'party',
    startTime: '',
    endTime: '',
    coverUrl: '',
    price: 0,
    ticketLimit: 100
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueId) {
      showToast('Nessuna venue selezionata', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, venueId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast('Evento creato con successo! 🎉', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crea Nuovo Evento">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase text-vibe-text-secondary">Titolo</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-field mt-1"
            placeholder="Nome dell'evento..."
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-vibe-text-secondary">Descrizione</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field mt-1 min-h-[80px]"
            placeholder="Di cosa si tratta?"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-vibe-text-secondary">Inizio</label>
            <input
              type="datetime-local"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-vibe-text-secondary">Prezzo (CHF)</label>
            <input
              type="number"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              className="input-field mt-1"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-vibe-text-secondary">Immagine di Copertina</label>
          <MediaUpload 
            bucket="events" 
            onUploadComplete={(url) => setFormData({ ...formData, coverUrl: url })}
            label="Carica la locandina dell'evento"
          />
        </div>
        <Button 
          type="submit" 
          variant="primary" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? 'Creazione...' : 'Pubblica Evento 🚀'}
        </Button>
      </form>
    </Modal>
  );
}
