'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCirclesStore, SocialCircle } from '@/stores/useCirclesStore';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, UserPlus, X, Search, ShieldCheck } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastProvider';

export default function CirclesPage() {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const { showToast } = useToast();
  
  const { 
    circles, 
    fetchCircles, 
    createCircle, 
    deleteCircle, 
    fetchMembers, 
    activeCircle, 
    setActiveCircle,
    addMember,
    removeMember,
    isLoading
  } = useCirclesStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newCircleName, setNewCircleName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchCircles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;
    const circle = await createCircle(newCircleName);
    if (circle) {
      setNewCircleName('');
      setIsCreating(false);
      showToast('Cerchio creato con successo!', 'success');
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${val}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const handleAddMember = async (userId: string) => {
    if (!activeCircle) return;
    // Check if already member
    if (activeCircle.members?.some(m => m.user_id === userId)) {
      showToast('Utente già presente nel cerchio', 'info');
      return;
    }
    await addMember(activeCircle.id, userId);
    showToast('Membro aggiunto!', 'success');
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <BackButton />
        <h1 className="text-2xl font-bold font-display vibe-gradient-text ml-12 uppercase tracking-tighter">
          Social Circles
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Circles List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase text-vibe-text-secondary tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-vibe-purple" />
              I Tuoi Cerchi
            </h2>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-2 bg-vibe-purple/10 text-vibe-purple rounded-lg hover:bg-vibe-purple/20 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {isCreating && (
              <motion.form 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onSubmit={handleCreate}
                className="glass-card p-4 space-y-3 mb-4 border-vibe-purple/30"
              >
                <input 
                  autoFocus
                  placeholder="Nome del cerchio (es. Close Friends)"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  className="input-field text-sm"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1">Crea</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>Annulla</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {circles.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCircle(c);
                  fetchMembers(c.id);
                }}
                className={`
                  w-full flex items-center justify-between p-4 rounded-2xl transition-all border
                  ${activeCircle?.id === c.id 
                    ? 'glass-card border-vibe-purple/50 bg-vibe-purple/5' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-vibe-gradient/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-vibe-purple" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">{c.name}</p>
                    <p className="text-[10px] text-vibe-text-secondary uppercase">
                      {c.members?.length || 0} Membri
                    </p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-vibe-purple opacity-50" />
              </button>
            ))}

            {circles.length === 0 && !isLoading && (
              <p className="text-center py-12 text-sm text-vibe-text-secondary opacity-50">
                Non hai ancora creato nessun cerchio.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Active Circle Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {activeCircle ? (
              <motion.div
                key={activeCircle.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold font-display">{activeCircle.name}</h2>
                      <p className="text-xs text-vibe-text-secondary mt-1">Gestisci chi può vedere i tuoi contenuti privati in questo cerchio.</p>
                    </div>
                    <button 
                      onClick={() => deleteCircle(activeCircle.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Add Member Search */}
                  <div className="relative mb-8">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary" />
                      <input 
                        placeholder="Cerca amici da aggiungere..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="absolute top-12 left-0 right-0 glass-card p-2 z-50 border-white/10 shadow-2xl space-y-1">
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => handleAddMember(u.id)}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/10"
                          >
                            <div className="flex items-center gap-3">
                              <img src={u.avatar_url || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full" />
                              <span className="text-sm font-medium">{u.display_name}</span>
                            </div>
                            <UserPlus className="w-4 h-4 text-vibe-purple" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Members List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-vibe-text-secondary mb-3">Membri Attuali</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeCircle.members?.map((m) => (
                        <div 
                          key={m.user_id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group"
                        >
                          <div className="flex items-center gap-3">
                            <img src={m.users?.avatar_url || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-full border border-white/10" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">{m.users?.display_name || 'Utente'}</p>
                              <p className="text-[10px] text-vibe-text-secondary">@{m.users?.username}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeMember(activeCircle.id, m.user_id)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-red-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {(!activeCircle.members || activeCircle.members.length === 0) && (
                        <div className="col-span-full py-12 text-center text-vibe-text-secondary opacity-50 space-y-2">
                           <Users className="w-12 h-12 mx-auto mb-2 stroke-[1px]" />
                           <p className="text-sm font-medium">Nessun membro in questo cerchio.</p>
                           <p className="text-xs">Usa la ricerca sopra per invitare qualcuno!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-[url('/grid.svg')] bg-repeat opacity-60">
                 <div className="w-20 h-20 rounded-[2.5rem] bg-vibe-gradient p-0.5 mb-6 rotate-3">
                   <div className="w-full h-full rounded-[2.5rem] bg-vibe-dark flex items-center justify-center">
                      <ShieldCheck className="w-10 h-10 text-vibe-purple" />
                   </div>
                 </div>
                 <h2 className="text-2xl font-bold font-display vibe-gradient-text mb-4 uppercase tracking-tighter">I Tuoi Cerchi Esclusivi</h2>
                 <p className="text-vibe-text-secondary max-w-sm">Seleziona un cerchio per gestire i membri o creane uno nuovo per condividere momenti speciali solo con chi vuoi tu.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
