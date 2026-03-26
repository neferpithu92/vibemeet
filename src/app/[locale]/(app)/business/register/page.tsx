'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/lib/i18n/navigation';

export default function BusinessRegisterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, [supabase]);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    legalName: '',
    businessType: 'club', // club, bar, promoter, festival
    uid: '', 
    email: '',
    phone: '',
    address: '',
    city: 'Zurigo',
    plan: 'pro'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    if (!userId) return;

    setLoading(true);
    try {
      // 1. Geocode via Mapbox
      let lat = 47.3769;
      let lng = 8.5417;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (token && !token.startsWith('pk.insert')) {
        const query = `${formData.address}, ${formData.city}`;
        const mapboxRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=ch&limit=1`
        );
        const mapData = await mapboxRes.json();
        if (mapData.features && mapData.features.length > 0) {
          const coords = mapData.features[0].center;
          lng = coords[0];
          lat = coords[1];
        }
      }

      // 2. Insert into Venues
      const { data: venue, error: venueError } = await supabase.from('venues').insert({
        name: formData.businessName,
        type: formData.businessType,
        address: formData.address,
        description: `Nuova registrazione per ${formData.businessName}`,
        location: `POINT(${lng} ${lat})`,
        owner_id: userId,
        contact_email: formData.email,
        contact_phone: formData.phone
      }).select().single();

      if (venueError) throw venueError;

      // 3. Update User Role
      await supabase.from('users').update({ role: 'venue' }).eq('id', userId);

      // 4. Hit Stripe Checkout using API
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: formData.plan, 
          entityId: venue.id, 
          entityType: 'venue' 
        })
      });
      const result = await res.json();
      
      if (result.url) {
        window.location.href = result.url; // Redirect to Stripe
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      alert('Si è verificato un errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 bg-vibe-green/20 text-vibe-green rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ✓
        </div>
        <h1 className="text-3xl font-display font-bold text-white mb-4">Richiesta Inviata!</h1>
        <p className="text-vibe-text-secondary mb-8">
          Abbiamo ricevuto i dettagli per <strong>{formData.businessName}</strong>. 
          Il nostro team verificherà la tua richiesta e ti contatterà via email entro 24 ore lavorative.
        </p>
        <Button onClick={() => router.push('/')}>Torna alla Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-display font-bold text-white mb-2">Diventa Partner</h1>
        <p className="text-vibe-text-secondary">Raggiungi il pubblico della vita notturna svizzera.</p>
      </div>

      <div className="flex justify-between mb-8 px-2 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -z-10 -translate-y-1/2" />
        <div className="absolute top-1/2 left-0 h-0.5 bg-vibe-purple -z-10 -translate-y-1/2 transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }} />
        
        {[1, 2, 3, 4].map(i => (
          <div 
            key={i} 
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
              step >= i ? 'bg-vibe-purple border-vibe-purple text-white' : 'bg-vibe-dark border-white/20 text-vibe-text-secondary'
            }`}
          >
            {i}
          </div>
        ))}
      </div>

      <div className="glass-card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">1. Dettagli Attività</h2>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">Nome Pubblico</label>
                <input required type="text" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} className="input-field" placeholder="Es. Kaufleuten Club" />
              </div>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">Tipo di Attività</label>
                <select value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} className="input-field bg-vibe-dark/50">
                  <option value="club">Discoteca / Club</option>
                  <option value="bar">Bar / Lounge</option>
                  <option value="promoter">Promoter</option>
                  <option value="festival">Festival</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">2. Dati Legali / Fatturazione</h2>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">Ragione Sociale</label>
                <input required type="text" value={formData.legalName} onChange={e => setFormData({...formData, legalName: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">UID Svizzera / P. IVA</label>
                <input required type="text" value={formData.uid} onChange={e => setFormData({...formData, uid: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">Indirizzo Sede e Città</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="input-field mb-2" placeholder="Via" />
                <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="input-field" placeholder="Città" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">3. Contatti Referente</h2>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="text-xs font-bold text-vibe-text-secondary uppercase mb-1 block">Telefono</label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">4. Scegli un Piano</h2>
              
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, plan: 'basic'})}
                  className={`w-full py-4 px-6 rounded-xl font-medium text-left transition-all ${
                    formData.plan === 'basic' 
                      ? 'bg-vibe-purple/20 border border-vibe-purple/40 ring-2 ring-vibe-purple/20' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-white font-bold text-lg">Piano Basic</p>
                  <p className="text-sm text-vibe-text-secondary">Ideale per piccoli locali</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, plan: 'pro'})}
                  className={`w-full py-4 px-6 rounded-xl font-medium text-left transition-all ${
                    formData.plan === 'pro' 
                      ? 'bg-vibe-purple/20 border border-vibe-purple/40 ring-2 ring-vibe-purple/20' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="text-white font-bold text-lg">Piano Pro</p>
                  <p className="text-sm text-vibe-text-secondary">Per discoteche e promoter con tanti eventi</p>
                </button>
              </div>

              <div className="p-4 bg-vibe-purple/10 border border-vibe-purple/20 rounded-xl mt-6">
                <p className="text-sm text-vibe-text font-medium mb-2">Checkout Sicuro:</p>
                <p className="text-xs text-vibe-text-secondary">Cliccando Registrati verrai reindirizzato al checkout Stripe per completare l'abbonamento. La verifica del conto sarà effettuata successivamente.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-6 border-t border-white/10 mt-8">
            {step > 1 && (
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Indietro
              </Button>
            )}
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Elaborazione...' : step < 4 ? 'Continua' : 'Effettua Checkout'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
