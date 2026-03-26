'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import CreateStory from '@/components/feed/CreateStory';
import CreatePost from '@/components/feed/CreatePost';
import CreateEvent from '@/components/events/CreateEvent';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Pagina di creazione hub per iniziare una Storia, un Post o un Evento.
 */
export default function CreateHubPage() {
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations('create');

  const handleSuccess = () => {
    // Dopo il successo, reindirizziamo al feed o dashboard
    router.push('/feed');
  };

  return (
    <div className="page-container flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold vibe-gradient-text mb-2">Cosa vuoi creare?</h1>
          <p className="text-vibe-text-secondary text-sm">Condividi le tue esperienze con la community</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card 
            hover 
            className="p-6 cursor-pointer group"
            onClick={() => setIsStoryOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-vibe-purple/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📱
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Nuova Storia</h2>
                <p className="text-xs text-vibe-text-secondary text-balance">Contenuto live che scompare dopo 24 ore e appare sulla mappa.</p>
              </div>
            </div>
          </Card>

          <Card 
            hover 
            className="p-6 cursor-pointer group"
            onClick={() => setIsPostOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-vibe-cyan/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                ✨
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Nuovo Post</h2>
                <p className="text-xs text-vibe-text-secondary text-balance">Pubblica foto o video nel feed globale in modo permanente.</p>
              </div>
            </div>
          </Card>

          <Card 
            hover 
            className="p-6 cursor-pointer group"
            onClick={() => setIsEventOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-vibe-pink/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🎉
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Nuovo Evento</h2>
                <p className="text-xs text-vibe-text-secondary text-balance">Organizza un party, un concerto o una serata speciale.</p>
              </div>
            </div>
          </Card>
        </div>

        <Button 
          variant="ghost" 
          className="w-full mt-4"
          onClick={() => router.back()}
        >
          Annulla
        </Button>
      </div>

      <CreateStory 
        isOpen={isStoryOpen} 
        onClose={() => setIsStoryOpen(false)} 
        onSuccess={handleSuccess}
      />
      
      <CreatePost 
        isOpen={isPostOpen} 
        onClose={() => setIsPostOpen(false)} 
        onSuccess={handleSuccess}
      />

      <CreateEvent
        isOpen={isEventOpen}
        onClose={() => setIsEventOpen(false)}
        onSuccess={() => router.push('/dashboard')}
      />
    </div>
  );
}
