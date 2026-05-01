'use client';

import { useState } from 'react';
import { useRouter } from '@/lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import CameraCapture, { type CaptureResult } from '@/components/camera/CameraCapture';
import CreatePost from '@/components/feed/CreatePost';
import CreateEvent from '@/components/events/CreateEvent';

type View = 'camera' | 'post' | 'event';

/**
 * Create Hub — Camera-first, stile Instagram.
 * Si apre direttamente sulla fotocamera con mode switcher integrato.
 * "Post testuale" e "Evento" sono accessibili dal menu in basso.
 */
export default function CreateHubPage() {
  const router  = useRouter();
  const t       = useTranslations('createHub');

  const [view, setView]             = useState<View>('camera');
  const [capturedMedia, setCaptured] = useState<CaptureResult | null>(null);
  const [showMenu, setShowMenu]     = useState(false);

  const handleCapture = (result: CaptureResult) => {
    setCaptured(result);
    setView('post');
  };

  const handleClose = () => {
    router.back();
  };

  const handlePostSuccess = () => {
    router.push('/feed');
  };

  // ── Camera (default view) ─────────────────────────────────────────────────
  if (view === 'camera') {
    return (
      <>
        <CameraCapture
          onCapture={handleCapture}
          onClose={handleClose}
        />

        {/* Menu overlay — accesso rapido a Post testuale / Evento */}
        {showMenu && (
          <div
            className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-end"
            onClick={() => setShowMenu(false)}
          >
            <div
              className="w-full bg-[#111] rounded-t-3xl p-6 pb-10 space-y-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />

              <button
                onClick={() => { setShowMenu(false); setView('post'); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <span className="text-3xl">✨</span>
                <div>
                  <p className="font-bold text-white">{t('newPost')}</p>
                  <p className="text-xs text-white/40">{t('postDescription')}</p>
                </div>
              </button>

              <button
                onClick={() => { setShowMenu(false); setView('event'); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <span className="text-3xl">🎉</span>
                <div>
                  <p className="font-bold text-white">{t('newEvent')}</p>
                  <p className="text-xs text-white/40">{t('eventDescription')}</p>
                </div>
              </button>

              <button
                onClick={() => setShowMenu(false)}
                className="w-full py-3 text-white/40 text-sm font-medium"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {/* ⊕ More options button — visibile sopra la fotocamera */}
        <button
          onClick={() => setShowMenu(true)}
          className="fixed top-4 right-16 z-[210] w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          aria-label="Altre opzioni"
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" />
          </svg>
        </button>
      </>
    );
  }

  // ── Post testuale / con media già catturato ───────────────────────────────
  if (view === 'post') {
    return (
      <>
        {/* Sfondo scuro mentre il modale è aperto */}
        <div className="fixed inset-0 bg-black z-[100]" />
        <CreatePost
          isOpen={true}
          onClose={() => {
            setCaptured(null);
            setView('camera');
          }}
          onSuccess={handlePostSuccess}
          initialMediaUrl={capturedMedia?.url}
          initialType={capturedMedia?.type === 'photo' ? 'photo' : capturedMedia?.type === 'video' ? 'video' : undefined}
        />
      </>
    );
  }

  // ── Crea Evento ───────────────────────────────────────────────────────────
  if (view === 'event') {
    return (
      <>
        <div className="fixed inset-0 bg-black z-[100]" />
        <CreateEvent
          isOpen={true}
          onClose={() => setView('camera')}
          onSuccess={() => router.push('/dashboard')}
        />
      </>
    );
  }

  return null;
}
