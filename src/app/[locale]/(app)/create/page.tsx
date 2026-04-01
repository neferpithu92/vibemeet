'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import CreateStory from '@/components/feed/CreateStory';
import CreatePost from '@/components/feed/CreatePost';
import CreateEvent from '@/components/events/CreateEvent';
import CameraCapture from '@/components/camera/CameraCapture';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';

/**
 * Pagina di creazione hub per iniziare una Storia, un Post o un Evento.
 */
export default function CreateHubPage() {
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video' | 'both'>('both');
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: 'photo' | 'video' } | null>(null);
  
  const router = useRouter();
  const t = useTranslations('createHub');

  const handleSuccess = () => {
    router.push('/feed');
  };

  const handleCameraCapture = (url: string, type: 'photo' | 'video') => {
    setCapturedMedia({ url, type });
    setIsCameraOpen(false);
    setIsPostOpen(true);
  };

  return (
    <div className="page-container flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold vibe-gradient-text mb-2">{t('title')}</h1>
          <p className="text-vibe-text-secondary text-sm">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Camera - Primary CTA */}
          <Card 
            hover 
            className="p-6 cursor-pointer group border-vibe-purple/30 bg-vibe-purple/5 shadow-[0_0_20px_rgba(157,78,221,0.1)]"
            onClick={() => {
              setCameraMode('both');
              setIsCameraOpen(true);
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-vibe-gradient flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📸
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Fotocamera</h2>
                <p className="text-xs text-vibe-text-secondary">
                  Scatta una foto o registra un Vibe in tempo reale
                </p>
              </div>
            </div>
          </Card>

          {/* Vibe (Reel) - Camera in video mode */}
          <Card 
            hover 
            className="p-6 cursor-pointer group"
            onClick={() => {
              setCameraMode('video');
              setIsCameraOpen(true);
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-vibe-pink/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🎬
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Vibe (Reel)</h2>
                <p className="text-xs text-vibe-text-secondary">
                  Registra un video verticale da condividere nel feed
                </p>
              </div>
            </div>
          </Card>
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
                <h2 className="font-bold text-lg">{t('newStory')}</h2>
                <p className="text-xs text-vibe-text-secondary text-balance">{t('storyDescription')}</p>
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
                <h2 className="font-bold text-lg">{t('newPost')}</h2>
                <p className="text-xs text-vibe-text-secondary text-balance">{t('postDescription')}</p>
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
                <h2 className="font-bold text-lg">{t('newEvent')}</h2>
                <p className="text-xs text-vibe-text-secondary text-balance">{t('eventDescription')}</p>
              </div>
            </div>
          </Card>
        </div>

        <Button 
          variant="ghost" 
          className="w-full mt-4"
          onClick={() => router.back()}
        >
          {t('cancel')}
        </Button>
      </div>

      <CreateStory 
        isOpen={isStoryOpen} 
        onClose={() => setIsStoryOpen(false)} 
        onSuccess={handleSuccess}
      />
      
      <CreatePost 
        isOpen={isPostOpen} 
        onClose={() => {
          setIsPostOpen(false);
          setCapturedMedia(null);
        }} 
        onSuccess={handleSuccess}
        initialMediaUrl={capturedMedia?.url}
        initialType={capturedMedia?.type}
      />

      <CreateEvent
        isOpen={isEventOpen}
        onClose={() => setIsEventOpen(false)}
        onSuccess={() => router.push('/dashboard')}
      />

      {isCameraOpen && (
        <CameraCapture
          mode={cameraMode}
          onCapture={handleCameraCapture}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
}
