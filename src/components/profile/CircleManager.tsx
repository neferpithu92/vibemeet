'use client';

import { useEffect, useState } from 'react';
import { useCirclesStore, SocialCircle } from '@/stores/useCirclesStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Users, UserPlus, Trash2, ShieldCheck, Search, Plus, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/ToastProvider';

export default function CircleManager() {
  const { 
    circles, 
    activeCircle, 
    fetchCircles, 
    createCircle, 
    deleteCircle, 
    fetchMembers, 
    addMember, 
    removeMember,
    setActiveCircle 
  } = useCirclesStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const { showToast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  useEffect(() => {
    if (activeCircle) {
      fetchMembers(activeCircle.id);
    }
  }, [activeCircle, fetchMembers]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const c = await createCircle(newName, newDesc);
    if (c) {
      setNewName('');
      setNewDesc('');
      setIsCreating(false);
      showToast('Cerchio creato!', 'success');
    }
  };

  const handleUserSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${q}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const handleAddMember = async (userId: string) => {
    if (!activeCircle) return;
    try {
      await addMember(activeCircle.id, userId);
      setSearchQuery('');
      setSearchResults([]);
      showToast('Utente aggiunto al cerchio!', 'success');
    } catch (err) {
      showToast('Errore aggiunta utente', 'error');
    }
  };

  if (activeCircle) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" onClick={() => setActiveCircle(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h2 className="text-2xl font-display font-black text-white">{activeCircle.name}</h2>
            <p className="text-sm text-white/50">{activeCircle.members?.length || 0} Membri</p>
          </div>
          <Button variant="ghost" size="sm" className="text-red-400" onClick={() => deleteCircle(activeCircle.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </header>

        {/* Add Member Search */}
        <div className="relative">
          <Input 
            placeholder="Cerca amici da aggiungere..."
            value={searchQuery}
            onChange={(e) => handleUserSearch(e.target.value)}
            className="pl-12 py-6 bg-white/5 border-white/10 rounded-2xl"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
          
          {searchResults.length > 0 && (
            <Card className="absolute top-16 inset-x-0 z-50 p-2 bg-vibe-dark/95 backdrop-blur-xl border-white/10 shadow-2xl">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleAddMember(user.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar_url} fallback={user.username[0]} size="sm" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{user.display_name || user.username}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">@{user.username}</p>
                    </div>
                  </div>
                  <UserPlus className="w-4 h-4 text-vibe-purple" />
                </button>
              ))}
            </Card>
          )}
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] px-2">Partecipanti</h3>
          <div className="grid grid-cols-1 gap-2">
            {activeCircle.members?.map(member => (
              <div key={member.user_id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Avatar src={member.users?.avatar_url} fallback={member.users?.username?.[0] || 'U'} size="md" />
                  <div>
                    <p className="font-bold text-white">{member.users?.display_name || member.users?.username}</p>
                    <p className="text-[10px] text-vibe-cyan font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" /> Trust: {member.users?.trust_score || 0}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeMember(activeCircle.id, member.user_id)}>
                  <Trash2 className="w-4 h-4 text-white/20 hover:text-red-400 transition-colors" />
                </Button>
              </div>
            ))}
            {(!activeCircle.members || activeCircle.members.length === 0) && (
              <div className="text-center py-20 opacity-20">
                <Users className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nessun membro</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-black text-white glow-text">SOCIAL CIRCLES</h2>
          <p className="text-sm text-white/40">Condividi momenti privati con gruppi selezionati.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="rounded-2xl h-12 px-6 shadow-vibe-purple/20 shadow-lg">
          <Plus className="w-5 h-5 mr-2" /> Nuovo Cerchio
        </Button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {circles.map(circle => (
          <Card 
            key={circle.id} 
            onClick={() => setActiveCircle(circle)}
            className="p-6 cursor-pointer group hover:bg-vibe-purple/5 border-white/5 hover:border-vibe-purple/30 transition-all duration-500 rounded-[2rem]"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-vibe-gradient flex items-center justify-center text-3xl shadow-xl animate-float">
                ⭕
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 group-hover:text-vibe-purple transition-colors">
                MEMBRI: {circle.members?.length || '...'}
              </div>
            </div>
            <h3 className="text-xl font-display font-black text-white group-hover:text-vibe-purple transition-colors">{circle.name}</h3>
            <p className="text-xs text-white/40 line-clamp-2 mt-2">{circle.description || 'Nessuna descrizione.'}</p>
          </Card>
        ))}

        {circles.length === 0 && (
          <div className="col-span-full text-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] opacity-20">
            <Users className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg font-display font-bold uppercase tracking-widest">Inizia a creare cerchi</p>
          </div>
        )}
      </div>

      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="Nuovo Cerchio Personale">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Nome del Gruppo</label>
              <Input 
                placeholder="es. Amici del Sabato" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="bg-white/5 border-white/10 rounded-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Descrizione</label>
              <textarea 
                placeholder="Di cosa si tratta?" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)} 
                className="input-field min-h-[100px] resize-none text-sm"
              />
            </div>
          </div>
          <Button variant="primary" className="w-full h-14 rounded-2xl font-bold text-lg" onClick={handleCreate}>
            Crea Cerchio ✨
          </Button>
        </div>
      </Modal>
    </div>
  );
}
