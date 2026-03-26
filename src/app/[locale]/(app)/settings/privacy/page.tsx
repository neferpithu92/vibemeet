'use client';

import { SocialCirclesManager } from '@/components/social/SocialCirclesManager';
import { Card } from '@/components/ui/Card';
import { Shield, Info } from 'lucide-react';

/**
 * Privacy & Social Circles Settings Page
 * Accessible at /settings/privacy
 */
export default function PrivacySettingsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-vibe-gradient flex items-center justify-center shadow-lg glow-purple">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Privacy & Social Circles</h1>
          <p className="text-sm text-vibe-text-secondary">Controlla chi può vedere i tuoi contenuti e chi appartiene ai tuoi gruppi privati.</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-vibe-purple/10 border border-vibe-purple/20 text-sm">
        <Info className="w-4 h-4 text-vibe-purple mt-0.5 flex-shrink-0" />
        <p className="text-vibe-text-secondary">
          I <strong className="text-vibe-text">Social Circles</strong> ti permettono di creare gruppi fidati. 
          Solo i membri di un Circle possono vedere gli eventi con visibilità <em>circles</em>. 
          Il <strong className="text-vibe-text">Trust Score</strong> è calcolato automaticamente in base all'interazione reciproca.
        </p>
      </div>

      {/* Main Card */}
      <Card className="p-6">
        <SocialCirclesManager />
      </Card>
    </div>
  );
}
