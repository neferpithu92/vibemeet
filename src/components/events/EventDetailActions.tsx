'use client';

import React, { useState } from 'react';
import { Ticket, Heart, Share2, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import TicketPurchaseFlow from './TicketPurchaseFlow';

interface EventDetailActionsProps {
  eventId: string;
  eventTitle: string;
  ticketPrice?: number;
  ticketUrl?: string;
}

export default function EventDetailActions({ eventId, eventTitle, ticketPrice, ticketUrl }: EventDetailActionsProps) {
  const [showTicketFlow, setShowTicketFlow] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: eventTitle, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        className="w-full mb-3"
        onClick={() => setShowTicketFlow(true)}
      >
        <Ticket className="w-4 h-4 mr-2" />
        {ticketPrice === 0 ? 'Partecipa Gratis' : ticketPrice ? `Biglietti da CHF ${ticketPrice}` : 'Ottieni Biglietto'}
      </Button>

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 text-sm" onClick={() => setSaved(s => !s)}>
          <Bookmark className={`w-4 h-4 mr-1 ${saved ? 'fill-vibe-purple text-vibe-purple' : ''}`} />
          {saved ? 'Salvato' : 'Salva'}
        </Button>
        <Button variant="ghost" className="flex-1 text-sm" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-1" />
          Condividi
        </Button>
      </div>

      <TicketPurchaseFlow
        eventId={eventId}
        eventTitle={eventTitle}
        isOpen={showTicketFlow}
        onClose={() => setShowTicketFlow(false)}
      />
    </>
  );
}
