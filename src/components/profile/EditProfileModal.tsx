'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { X, Check, Save, User, FileText } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    display_name: string | null;
    username: string;
    bio: string | null;
  };
  onUpdate: (updatedData: { display_name: string; bio: string | null }) => void;
}

export default function EditProfileModal({ 
  isOpen, 
  onClose, 
  profile, 
  onUpdate 
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          bio: bio
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      onUpdate({ display_name: displayName, bio: bio });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div 
        className="w-full max-w-md bg-vibe-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-vibe-gradient flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
             </div>
              <h2 className="font-display font-bold text-xl">Profilo e Identità</h2>
          </div>
          <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={onClose}>
              <p className="text-[10px] text-vibe-purple font-bold tracking-widest uppercase animate-pulse">Tocca l'avatar nel profilo per cambiare foto</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-white/50" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-vibe-text-secondary flex items-center gap-2">
               <User className="w-4 h-4" /> Nome Visualizzato
            </label>
            <input 
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-vibe-purple focus:ring-1 focus:ring-vibe-purple transition-all"
              placeholder="Il tuo nome reale o alias"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-vibe-text-secondary flex items-center gap-2">
               <FileText className="w-4 h-4" /> Biografia
            </label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-vibe-purple focus:ring-1 focus:ring-vibe-purple transition-all min-h-[120px] resize-none"
              placeholder="Raccontaci qualcosa di te..."
            />
          </div>

          {error && (
             <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                ⚠️ {error}
             </div>
          )}
        </div>

        <div className="p-6 pt-2 border-t border-white/5 flex gap-3">
          <Button 
            variant="secondary" 
            className="flex-1" 
            onClick={onClose}
            disabled={isSaving}
          >
            Annulla
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 font-bold"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvataggio...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                 <Save className="w-4 h-4" /> Salva modifiche
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
