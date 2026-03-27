'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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

interface VenueOption {
  id: string;
  name: string;
}

export default function CreateEvent({ isOpen, onClose, onSuccess, venueId: initialVenueId }: CreateEventProps) {
  const t = useTranslations('events_create');
  const supabase = createClient();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userVenues, setUserVenues] = useState<VenueOption[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(initialVenueId || null);

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

  // Carica le venue dell'utente se non è passata una venueId
  useEffect(() => {
    if (isOpen && !initialVenueId) {
      const fetchVenues = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: venues } = await supabase
          .from('venues')
          .select('id, name')
          .eq('owner_id', user.id);
        
        if (venues) {
          setUserVenues(venues);
          if (venues.length === 1) setSelectedVenueId(venues[0].id);
        }
      };
      fetchVenues();
    }
  }, [isOpen, initialVenueId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenueId) {
      showToast(t('errorNoVenue'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('errorUnauthorized'));

      const { data, error } = await supabase.from('events').insert({
        ...formData,
        venue_id: selectedVenueId,
        organizer_id: user.id,
        starts_at: new Date(formData.startTime).toISOString(),
        ends_at: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        ticket_price: formData.price,
        slug: formData.title.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
        location: (await supabase.from('venues').select('location').eq('id', selectedVenueId).single()).data?.location
      }).select().single();

      if (error) throw error;

      showToast(t('success'), 'success', '🎉');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err instanceof Error ? err.message : t('errorUnexpected'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialVenueId && userVenues.length > 1 && (
          <div>
            <label className="text-xs font-bold uppercase text-vibe-text-secondary">{t('selectVenue')}</label>
            <select 
              className="input-field mt-1"
              value={selectedVenueId || ''}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              required
            >
              <option value="">{t('chooseVenue')}</option>
              {userVenues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-bold uppercase text-vibe-text-secondary">{t('eventTitle')}</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="input-field mt-1"
            placeholder={t('eventPlaceholder')}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-vibe-text-secondary">{t('description')}</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input-field mt-1 min-h-[80px]"
            placeholder={t('descriptionPlaceholder')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-vibe-text-secondary">{t('start')}</label>
            <input
              type="datetime-local"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-vibe-text-secondary">{t('price')}</label>
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
          <label className="text-xs font-bold uppercase text-vibe-text-secondary">{t('coverImage')}</label>
          <MediaUpload 
            bucket="events" 
            onUploadComplete={(url) => setFormData({ ...formData, coverUrl: url })}
            label={t('uploadLabel')}
          />
        </div>
        <Button 
          type="submit" 
          variant="primary" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? t('creating') : t('publish')}
        </Button>
      </form>
    </Modal>
  );
}
