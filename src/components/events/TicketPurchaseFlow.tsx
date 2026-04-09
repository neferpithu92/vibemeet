'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { CreditCard, Check, X, ChevronRight, Shield, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface TicketType {
  id: string;
  name: string;
  price: number;
  remaining: number;
  description?: string;
}

interface TicketPurchaseFlowProps {
  eventId: string;
  eventTitle: string;
  ticketTypes?: TicketType[];
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select' | 'quantity' | 'details' | 'payment' | 'confirmation';

const DEFAULT_TICKET_TYPES: TicketType[] = [
  { id: 'general', name: 'Ingresso Generale', price: 0, remaining: 100 },
  { id: 'vip', name: 'VIP Table', price: 50, remaining: 10, description: 'Tavolo riservato + bottiglia inclusa' },
  { id: 'early', name: 'Early Bird', price: 15, remaining: 20, description: 'Disponibile fino alle 22:00' }
];

export default function TicketPurchaseFlow({ eventId, eventTitle, ticketTypes, isOpen, onClose }: TicketPurchaseFlowProps) {
  const t = useTranslations('tickets');
  const supabase = createClient();

  const types: TicketType[] = ticketTypes?.length ? ticketTypes : [
    { id: 'general', name: t('types.general'), price: 0, remaining: 100 },
    { id: 'vip', name: t('types.vip'), price: 50, remaining: 10, description: t('types.vipDesc') },
    { id: 'early', name: t('types.early'), price: 15, remaining: 20, description: t('types.earlyDesc') }
  ];

  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [details, setDetails] = useState({ name: '', email: '', phone: '', specialRequests: '' });
  const [processing, setProcessing] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{ ticketId: string; qrData: string } | null>(null);

  const total = (selectedType?.price || 0) * quantity;

  const handlePurchase = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create ticket in DB (simplified - real flow would use Stripe)
      const { data: ticket } = await supabase.from('tickets').insert({
        event_id: eventId,
        user_id: user.id,
        ticket_type: selectedType?.id || 'general',
        quantity,
        total_price: total,
        attendee_name: details.name || user.id,
        attendee_email: details.email,
        status: total === 0 ? 'confirmed' : 'pending_payment'
      }).select('id').single();

      if (ticket) {
        const qrData = JSON.stringify({ ticketId: ticket.id, eventId, userId: user.id });
        setConfirmationData({ ticketId: ticket.id, qrData: btoa(qrData) });
        setStep('confirmation');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const steps: Step[] = ['select', 'quantity', 'details', 'payment', 'confirmation'];
  const stepIndex = steps.indexOf(step);

  const reset = () => {
    setStep('select');
    setSelectedType(null);
    setQuantity(1);
    setDetails({ name: '', email: '', phone: '', specialRequests: '' });
    setConfirmationData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
        onClick={e => e.target === e.currentTarget && reset()}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="w-full max-w-lg bg-vibe-surface rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="font-display font-bold text-lg">{t('selectType')}</h2>
              <p className="text-sm text-vibe-text-secondary truncate">{eventTitle}</p>
            </div>
            <button onClick={reset} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress */}
          {step !== 'confirmation' && (
            <div className="flex px-6 pt-4 gap-1">
              {steps.slice(0, 4).map((s, i) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIndex ? 'bg-vibe-purple' : 'bg-white/10'}`} />
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Step: Select Type */}
            {step === 'select' && (
              <div className="space-y-3">
                {types.map(type => (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedType(type); setStep('quantity'); }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      selectedType?.id === type.id
                        ? 'border-vibe-purple bg-vibe-purple/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{type.name}</span>
                      <span className="font-bold text-vibe-purple">
                        {type.price === 0 ? t('free') : `CHF ${type.price}`}
                      </span>
                    </div>
                    {type.description && <p className="text-xs text-vibe-text-secondary">{type.description}</p>}
                    <p className="text-xs text-green-400 mt-1">✓ {t('remaining', { count: type.remaining })}</p>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Step: Quantity */}
            {step === 'quantity' && selectedType && (
              <div className="space-y-6">
                <div className="glass-card p-4 rounded-2xl">
                  <p className="text-sm text-vibe-text-secondary mb-1">{selectedType.name}</p>
                  <p className="font-bold text-2xl text-vibe-purple">
                    {selectedType.price === 0 ? t('free') : `CHF ${selectedType.price} × ${quantity}`}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t('selectQuantity')}</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl font-bold">−</button>
                    <span className="text-2xl font-bold w-8 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(10, q + 1))}
                      className="w-10 h-10 rounded-full bg-vibe-purple/20 hover:bg-vibe-purple/30 text-vibe-purple flex items-center justify-center text-xl font-bold">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-white/10">
                  <span className="font-bold">{t('total')}</span>
                  <span className="font-display text-2xl font-bold text-vibe-purple">
                    CHF {total.toFixed(2)}
                  </span>
                </div>
                <Button variant="primary" className="w-full" onClick={() => setStep('details')}>
                  {t('attendeeDetails')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step: Details */}
            {step === 'details' && (
              <div className="space-y-4">
                <input type="text" placeholder={t('name')} value={details.name} onChange={e => setDetails(d => ({ ...d, name: e.target.value }))} className="input-field" />
                <input type="email" placeholder={t('email')} value={details.email} onChange={e => setDetails(d => ({ ...d, email: e.target.value }))} className="input-field" />
                <input type="tel" placeholder={t('phone')} value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} className="input-field" />
                <textarea placeholder={t('specialRequests')} value={details.specialRequests} onChange={e => setDetails(d => ({ ...d, specialRequests: e.target.value }))} className="input-field min-h-[80px] resize-none" />
                <Button variant="primary" className="w-full" onClick={() => setStep('payment')}>
                  {t('payment')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step: Payment */}
            {step === 'payment' && (
              <div className="space-y-4">
                <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
                  <span className="text-vibe-text-secondary">{t('total')}</span>
                  <span className="font-display text-2xl font-bold text-vibe-purple">CHF {total.toFixed(2)}</span>
                </div>

                {/* Payment methods */}
                <div className="space-y-2">
                  {[
                    { icon: '💳', label: t('methods.creditCard') },
                    { icon: '📱', label: t('methods.twint') },
                    { icon: '🍎', label: t('methods.applePay') },
                    { icon: 'G', label: t('methods.googlePay') }
                  ].map(m => (
                    <button key={m.label} className="w-full flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left">
                      <span className="text-xl w-8 text-center">{m.icon}</span>
                      <span className="font-semibold">{m.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-vibe-text-secondary">
                  <Shield className="w-3 h-3" />
                  <span>{t('paymentSecure')}</span>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handlePurchase}
                  disabled={processing}
                >
                  {processing ? t('processing') : t('pay', { total: total.toFixed(2) })}
                </Button>
              </div>
            )}

            {/* Step: Confirmation */}
            {step === 'confirmation' && confirmationData && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-green-400 mb-1">{t('confirmation')} ✓</h3>
                  <p className="text-vibe-text-secondary text-sm">{eventTitle}</p>
                </div>
                {/* QR Code placeholder */}
                <div className="bg-white p-6 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-black" />
                </div>
                <p className="text-xs text-vibe-text-secondary">ID: {confirmationData.ticketId.slice(0, 8).toUpperCase()}</p>

                <div className="grid grid-cols-2 gap-3">
                  <button className="btn-secondary text-sm py-3">{t('addToCalendar')}</button>
                  <button className="btn-secondary text-sm py-3">{t('shareTicket')}</button>
                </div>
                <button className="btn-primary w-full" onClick={reset}>{t('addToWallet')}</button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
