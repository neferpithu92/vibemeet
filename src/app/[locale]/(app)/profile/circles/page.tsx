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
  const t = useTranslations('social.circles');
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
      showToast(t('createdSuccess'), 'success');
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
      showToast(t('userAlreadyIn'), 'info');
      return;
    }
    await addMember(activeCircle.id, userId);
    showToast(t('memberAdded'), 'success');
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative min-h-screen">
      <div className="flex items-center gap-4 mb-12">
        <BackButton />
        <div className="ml-12">
          <h1 className="text-3xl font-black font-display text-white tracking-tighter uppercase">
            Social Circles
          </h1>
          <p className="text-sm text-white/40 font-medium">Condividi momenti privati con i tuoi gruppi preferiti.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Circles List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-[10px] font-bold uppercase text-white/30 tracking-[0.3em] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-vibe-purple" />
              I Tuoi Cerchi
            </h2>
            <button 
              onClick={() => setIsCreating(true)}
              className="w-10 h-10 bg-vibe-purple/10 text-vibe-purple rounded-2xl hover:bg-vibe-purple/20 transition-all flex items-center justify-center shadow-lg shadow-vibe-purple/5"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {isCreating && (
              <motion.form 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleCreate}
                className="p-5 bg-white/5 border border-vibe-purple/30 rounded-3xl space-y-4 shadow-2xl shadow-vibe-purple/10"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Nome del Cerchio</label>
                  <input 
                    autoFocus
                    placeholder="es. Amici del Sabato"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    className="input-field text-sm h-12 rounded-2xl"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1 h-11 rounded-xl">Crea Cerchio ✨</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-11 rounded-xl" onClick={() => setIsCreating(false)}>{tc('cancel')}</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {circles.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCircle(c);
                  fetchMembers(c.id);
                }}
                className={`
                  w-full flex items-center justify-between p-5 rounded-[2rem] transition-all duration-500 border
                  ${activeCircle?.id === c.id 
                    ? 'bg-vibe-purple/20 border-vibe-purple shadow-xl shadow-vibe-purple/10 scale-105' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform duration-500 ${activeCircle?.id === c.id ? 'bg-vibe-purple rotate-3' : 'bg-vibe-gradient/20'}`}>
                    ⭕
                  </div>
                  <div className="text-left">
                    <p className={`font-black text-lg transition-colors ${activeCircle?.id === c.id ? 'text-white' : 'text-white/80'}`}>{c.name}</p>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                      {c.members?.length || 0} Membri
                    </p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 transition-all ${activeCircle?.id === c.id ? 'text-vibe-purple translate-x-1' : 'text-white/10'}`} />
              </button>
            ))}

            {circles.length === 0 && !isLoading && (
              <div className="text-center py-24 opacity-10">
                <Users className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-display font-bold uppercase tracking-widest">Nessun Cerchio</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Circle Details */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {activeCircle ? (
              <motion.div
                key={activeCircle.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8"
              >
                <header className="flex items-center justify-between p-8 bg-vibe-gradient/10 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-vibe-purple/20 blur-[100px] -mr-32 -mt-32" />
                  <div className="relative z-10">
                    <h2 className="text-4xl font-display font-black text-white tracking-tighter mb-2">{activeCircle.name}</h2>
                    <p className="text-sm text-white/50 font-medium">Gestisci chi può visualizzare i tuoi contenuti riservati.</p>
                  </div>
                  <button 
                    onClick={() => deleteCircle(activeCircle.id)}
                    className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all relative z-10"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-5 space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 px-2 flex items-center gap-2">
                       <Plus className="w-3.5 h-3.5 text-vibe-purple" /> Aggiungi Membri
                    </h3>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        placeholder="Cerca username..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="input-field pl-12 h-14 rounded-2xl bg-white/5 border-white/10"
                      />
                    </div>

                    <AnimatePresence>
                      {searchResults.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-2 bg-vibe-dark/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-2xl space-y-1">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => handleAddMember(u.id)}
                              className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-vibe-purple/10 group transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar src={u.avatar_url} fallback={u.username[0]} size="md" />
                                <div className="text-left">
                                  <span className="text-sm font-bold text-white group-hover:text-vibe-purple transition-colors">{u.display_name || u.username}</span>
                                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">@{u.username}</p>
                                </div>
                              </div>
                              <UserPlus className="w-5 h-5 text-vibe-purple animate-pulse" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="md:col-span-7 space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 px-2 flex items-center gap-2">
                       <Users className="w-3.5 h-3.5 text-vibe-cyan" /> Partecipanti ({activeCircle.members?.length || 0})
                    </h3>
                    <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {activeCircle.members?.map((m) => (
                        <motion.div 
                          layout
                          key={m.user_id}
                          className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar src={m.users?.avatar_url} fallback={m.users?.username?.[0] || 'U'} size="lg" hasStory={true} />
                            <div className="min-w-0">
                              <p className="font-black text-white group-hover:text-vibe-cyan transition-colors truncate">{m.users?.display_name || 'Vibe User'}</p>
                              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">@{m.users?.username}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-vibe-cyan font-bold uppercase tracking-tighter bg-vibe-cyan/10 px-2 py-0.5 rounded-full">Trust: {m.users?.trust_score || 0}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeMember(activeCircle.id, m.user_id)}
                            className="w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}

                      {(!activeCircle.members || activeCircle.members.length === 0) && (
                        <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] opacity-20">
                           <Users className="w-16 h-16 mx-auto mb-4" />
                           <p className="text-sm font-bold uppercase tracking-[0.2em]">{t('emptyMembersTitle')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-white/5 rounded-[3rem] border border-white/5 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full bg-[url('/img/grid.svg')] opacity-20" />
                 <div className="relative z-10 flex flex-col items-center">
                   <div className="w-32 h-32 rounded-[2.5rem] bg-vibe-gradient rotate-12 flex items-center justify-center shadow-2xl animate-float mb-10">
                      <ShieldCheck className="w-16 h-16 text-white -rotate-12" />
                   </div>
                   <h2 className="text-4xl font-display font-black text-white mb-6 uppercase tracking-tighter leading-none">Proteggi la tua<br/>Privacy</h2>
                   <p className="text-white/40 max-w-sm font-medium leading-relaxed">I Cerchi Sociali ti permettono di scegliere esattamente chi può vedere i tuoi contenuti più esclusivi.</p>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
