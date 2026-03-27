'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCirclesStore, SocialCircle } from '@/stores/useCirclesStore';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Trash2, UserMinus, Search, Shield, Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/**
 * Social Circles Manager — UI per la gestione dei gruppi di visibilità.
 * Integrata nella Privacy Center di VIBE.
 */
export function SocialCirclesManager() {
  const t = useTranslations('social.circles');
  const {
    circles, activeCircle, isLoading,
    fetchCircles, createCircle, deleteCircle,
    fetchMembers, addMember, removeMember, setActiveCircle,
  } = useCirclesStore();

  const supabase = createClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => { fetchCircles(); }, []);

  useEffect(() => {
    if (activeCircle) fetchMembers(activeCircle.id);
  }, [activeCircle?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const circle = await createCircle(newName.trim(), newDescription.trim() || undefined);
    if (circle) {
      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      setActiveCircle(circle);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, trust_score')
      .ilike('username', `%${q}%`)
      .limit(8);
    setSearchResults(data ?? []);
    setIsSearching(false);
  };

  const handleAddMember = async (userId: string) => {
    if (!activeCircle) return;
    await addMember(activeCircle.id, userId);
    setSearchQuery('');
    setSearchResults([]);
  };

  const memberIds = new Set(activeCircle?.members?.map(m => m.user_id) ?? []);

  return (
    <div className="flex gap-4 h-[520px]">
      {/* --- Colonna Sinistra: lista circles --- */}
      <div className="w-56 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-vibe-text-secondary uppercase tracking-wider">{t('title')}</span>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1 rounded-lg hover:bg-white/10 text-vibe-purple transition-colors"
            title={t('create')}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="glass-card p-3 space-y-2 overflow-hidden"
            >
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('placeholderName')}
                className="input-field text-sm py-1.5"
                maxLength={64}
              />
              <input
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder={t('placeholderDesc')}
                className="input-field text-sm py-1.5"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1 text-xs">{t('createBtn')}</Button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-xs text-vibe-text-secondary hover:text-white"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
          {circles.map(circle => (
            <button
              key={circle.id}
              onClick={() => setActiveCircle(circle)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm ${
                activeCircle?.id === circle.id
                   ? 'bg-vibe-purple/15 text-vibe-purple border border-vibe-purple/20'
                  : 'hover:bg-white/5 text-vibe-text-secondary border border-transparent'
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="truncate font-medium">{circle.name}</span>
            </button>
          ))}
          {circles.length === 0 && !isLoading && (
            <div className="text-center py-8 opacity-40 text-sm">
              <Shield className="w-8 h-8 mx-auto mb-2" />
              <p>{t('none')}</p>
            </div>
          )}
        </div>
      </div>

      {/* --- Separatore --- */}
      <div className="w-px bg-white/5 flex-shrink-0" />

      {/* --- Colonna Destra: gestione circle attivo --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeCircle ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-4 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg">{activeCircle.name}</h3>
                {activeCircle.description && (
                  <p className="text-sm text-vibe-text-secondary">{activeCircle.description}</p>
                )}
                <p className="text-xs text-vibe-text-secondary mt-1">
                  {t('members', { count: activeCircle.members?.length ?? 0 })}
                </p>
              </div>
              <button
                onClick={() => deleteCircle(activeCircle.id)}
                className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors"
                title={t('delete')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Search per aggiungere membri */}
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vibe-text-secondary" />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder={t('searchUsers')}
                className="input-field pl-9 text-sm"
              />
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 mt-1 glass-card p-1 z-10 max-h-44 overflow-y-auto custom-scrollbar"
                  >
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleAddMember(u.id)}
                        disabled={memberIds.has(u.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <img
                          src={u.avatar_url || 'https://via.placeholder.com/32'}
                          alt={u.display_name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div className="text-left flex-1">
                          <p className="font-medium text-sm">{u.display_name}</p>
                          <p className="text-xs text-vibe-text-secondary">@{u.username}</p>
                        </div>
                        {u.trust_score > 50 && (
                          <span className="text-[10px] text-vibe-yellow flex items-center gap-0.5">
                            <Star className="w-3 h-3" /> {Math.round(u.trust_score)}
                          </span>
                        )}
                        {memberIds.has(u.id) ? (
                          <span className="text-xs text-vibe-text-secondary">{t('alreadyIn')}</span>
                        ) : (
                          <span className="text-xs text-vibe-purple">+ {t('add')}</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lista membri */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {(activeCircle.members ?? []).map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <img
                    src={member.users?.avatar_url || 'https://via.placeholder.com/40'}
                    alt={member.users?.display_name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-medium text-sm truncate">{member.users?.display_name}</p>
                    <p className="text-xs text-vibe-text-secondary truncate">@{member.users?.username}</p>
                  </div>
                  {(member.users?.trust_score ?? 0) > 30 && (
                    <div className="flex items-center gap-1 text-vibe-yellow text-[10px]">
                      <Star className="w-3 h-3" />
                      <span>{Math.round(member.users?.trust_score ?? 0)}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeMember(activeCircle.id, member.user_id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    title={t('removeMember')}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {(activeCircle.members?.length ?? 0) === 0 && (
                <div className="text-center py-8 opacity-40 text-sm">
                  <Users className="w-10 h-10 mx-auto mb-2" />
                  <p>{t('searchUsers')}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
            <Shield className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">{t('select')}</p>
            <p className="text-xs mt-1">{t('orCreate')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
