'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import MediaUpload from '@/components/ui/MediaUpload';
import { motion, AnimatePresence } from 'framer-motion';

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

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'party',
    startTime: '',
    endTime: '',
    coverUrl: '',
    price: 0,
    ticketLimit: 100,
    address: ''
  });

  const categories = [
    { id: 'party', icon: '🎉', label: 'Party' },
    { id: 'concert', icon: '🎸', label: 'Concert' },
    { id: 'lounge', icon: '🍸', label: 'Lounge' },
    { id: 'festival', icon: '🎪', label: 'Festival' },
    { id: 'workshop', icon: '🎨', label: 'Workshop' },
  ];

  // Carica le venue dell'utente se non è passata una venueId
  useEffect(() => {
    if (isOpen && !initialVenueId) {
      const fetchVenues = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: venues } = await (supabase
          .from('venues') as any)
          .select('id, name')
          .eq('owner_id', user.id);
        
        if (venues) {
          setUserVenues(venues);
          if (venues.length === 1) setSelectedVenueId((venues[0] as any).id);
        }
      };
      fetchVenues();
    }
  }, [isOpen, initialVenueId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('errorUnauthorized'));

      let eventLocation = 'POINT(8.5417 47.3769)'; // Default to Zurich if no venue is selected
      if (selectedVenueId) {
        const { data: venueData } = await (supabase.from('venues') as any).select('location').eq('id', selectedVenueId).single();
        if (venueData?.location) eventLocation = venueData.location;
      }

      const { data, error } = await (supabase.from('events') as any).insert({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        venue_id: selectedVenueId || null,
        organizer_id: user.id,
        starts_at: new Date(formData.startTime).toISOString(),
        ends_at: formData.endTime ? new Date(formData.endTime).toISOString() : null,
        ticket_price: formData.price,
        slug: formData.title.toLowerCase().replace(/ /g, '-') + '-' + Date.now(),
        location: eventLocation,
        address: selectedVenueId ? null : formData.address
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
      <div className="mb-6 flex justify-between px-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s ? 'bg-vibe-purple text-white scale-110 shadow-[0_0_15px_rgba(157,78,221,0.5)]' : 
              step > s ? 'bg-vibe-cyan text-vibe-dark' : 'bg-white/10 text-white/40'
            }`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-[10px] uppercase font-bold tracking-widest ${step >= s ? 'text-white' : 'text-white/20'}`}>
              {s === 1 ? 'Info' : s === 2 ? 'Media' : 'Pricing'}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {!initialVenueId && (
              <div>
                <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">{t('selectVenue')}</label>
                {userVenues.length > 0 ? (
                  <select 
                    className="input-field mt-1.5"
                    value={selectedVenueId || ''}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                  >
                    <option value="">Nessuna Venue (Usa indirizzo personalizzato)</option>
                    {userVenues.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1.5 text-xs text-white/40 italic">Nessuna venue posseduta. Inserisci un indirizzo qui sotto.</div>
                )}
              </div>
            )}
            
            {!selectedVenueId && (
              <div>
                <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">Indirizzo Custom</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field mt-1.5"
                  placeholder="Es: Via Roma 1, Milano"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">{t('eventTitle')}</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input-field mt-1.5"
                placeholder={t('eventPlaceholder')}
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest mb-2 block">Categoria</label>
              <div className="grid grid-cols-5 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                      formData.category === cat.id 
                        ? 'bg-vibe-purple/20 border-vibe-purple text-white' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-[9px] uppercase font-bold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">{t('description')}</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field mt-1.5 min-h-[100px] resize-none"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            <Button type="button" variant="primary" className="w-full mt-4" onClick={() => setStep(2)} disabled={!formData.title || !formData.description}>
              Avanti
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">{t('coverImage')}</label>
              <div className="mt-1.5">
                <MediaUpload 
                  bucket="events" 
                  onUploadComplete={(url) => setFormData({ ...formData, coverUrl: url })}
                  label={t('uploadLabel')}
                />
              </div>
              {formData.coverUrl && (
                <div className="mt-4 aspect-video rounded-2xl overflow-hidden border border-white/10">
                  <img src={formData.coverUrl} className="w-full h-full object-cover" alt="Preview" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(1)}>Indietro</Button>
              <Button type="button" variant="primary" className="flex-1" onClick={() => setStep(3)} disabled={!formData.coverUrl}>Avanti</Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">{t('start')}</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-vibe-text-secondary tracking-widest">{t('price')}</label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">CHF</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="input-field pl-12"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-vibe-purple">Riepilogo</h4>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Evento:</span>
                <span className="text-white font-medium">{formData.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Data:</span>
                <span className="text-white font-medium">{formData.startTime ? new Date(formData.startTime).toLocaleString() : '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Prezzo:</span>
                <span className="text-vibe-cyan font-bold">{formData.price} CHF</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(2)}>Indietro</Button>
              <Button 
                type="submit" 
                variant="primary" 
                className="flex-1 bg-gradient-to-r from-vibe-purple to-vibe-pink" 
                disabled={isLoading || !formData.startTime}
              >
                {isLoading ? t('creating') : t('publish')}
              </Button>
            </div>
          </motion.div>
        )}
      </form>
    </Modal>
  );
}
