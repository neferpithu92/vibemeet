'use client';

import React, { useState } from 'react';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

/**
 * Pagina Login — email/password, OAuth, magic link, 2FA.
 * Connessa a Supabase Auth.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Gestione errori dalla URL
  const urlError = searchParams.get('error');
  const urlMessage = searchParams.get('message');
  
  const [error, setError] = useState<string | null>(urlError ? (urlMessage || 'Errore di autenticazione') : null);
  const [message, setMessage] = useState<string | null>(null);

  /** Login con email e password */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    router.push('/map');
    router.refresh();
  };

  /** Login con OAuth provider (Google, Apple, Facebook) */
  const handleOAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    }
  };

  /** Login con Magic Link */
  const handleMagicLink = async () => {
    if (!email) {
      setError('Inserisci la tua email per ricevere il Magic Link');
      return;
    }
    setIsLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setMessage('Controlla la tua email per il Magic Link! ✨');
    }
    setIsLoading(false);
  };

  /** Reset Password */
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Inserisci la tua email per recuperare la password');
      return;
    }
    setIsLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Ti abbiamo inviato un link per reimpostare la password. Controlla la tua email! 📧');
    }
    setIsLoading(false);
  };

  /** Verify 2FA code */
  const handleVerify2FA = async () => {
    if (!twoFACode || twoFACode.length < 6) {
      setError('Inserisci il codice a 6 cifre');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        setError('Nessun fattore 2FA trovato');
        setIsLoading(false);
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: twoFACode,
      });
      if (verifyError) throw verifyError;
      router.push('/map');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Codice non valido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-vibe-gradient flex items-center justify-center mx-auto mb-4 shadow-lg glow-purple">
          <span className="text-white text-2xl font-bold font-display">V</span>
        </div>
        <h1 className="font-display text-3xl font-bold vibe-gradient-text mb-2">
          Bentornato su VIBE
        </h1>
        <p className="text-vibe-text-secondary text-sm">
          Scopri il mondo intorno a te
        </p>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-fade-in">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm text-center animate-fade-in">
          {message}
        </div>
      )}

      <Card className="p-6">
        {!show2FA ? (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-vibe-text-secondary mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua@email.ch"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-vibe-text-secondary">
                    Password
                  </label>
                  <button type="button" onClick={handleForgotPassword} className="text-xs text-vibe-purple hover:text-vibe-pink transition-colors">
                    Password dimenticata?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Accedi
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-vibe-surface text-vibe-text-secondary">
                  oppure continua con
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handleOAuth('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continua con Google
              </button>
              <button
                onClick={() => handleOAuth('apple')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Continua con Apple
              </button>
              <button
                onClick={() => handleOAuth('facebook')}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Continua con Facebook
              </button>
            </div>

            {/* Magic Link */}
            <button
              onClick={handleMagicLink}
              className="w-full mt-4 text-center text-sm text-vibe-purple hover:text-vibe-pink transition-colors"
            >
              ✨ Accedi con Magic Link
            </button>
          </>
        ) : (
          /* 2FA Section */
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-vibe-purple/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Verifica 2FA</h2>
            <p className="text-sm text-vibe-text-secondary mb-6">
              Inserisci il codice dalla tua app di autenticazione
            </p>
            <input
              type="text"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value)}
              placeholder="000 000"
              className="input-field text-center text-2xl tracking-[0.5em] mb-4"
              maxLength={6}
            />
            <Button variant="primary" className="w-full" onClick={handleVerify2FA} isLoading={isLoading}>
              Verifica
            </Button>
            <button
              onClick={() => setShow2FA(false)}
              className="mt-4 text-sm text-vibe-text-secondary hover:text-vibe-text transition-colors"
            >
              ← Torna al login
            </button>
          </div>
        )}
      </Card>

      {/* Footer */}
      <p className="text-center mt-6 text-sm text-vibe-text-secondary">
        Non hai un account?{' '}
        <Link href="/register" className="text-vibe-purple hover:text-vibe-pink transition-colors font-medium">
          Registrati
        </Link>
      </p>
    </div>
  );
}
