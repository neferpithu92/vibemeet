import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface CircleMember {
  user_id: string;
  added_at: string;
  users?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
    trust_score: number;
  };
}

export interface SocialCircle {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  created_at: string;
  members?: CircleMember[];
}

interface CirclesState {
  circles: SocialCircle[];
  activeCircle: SocialCircle | null;
  isLoading: boolean;
  error: string | null;

  fetchCircles: () => Promise<void>;
  createCircle: (name: string, description?: string) => Promise<SocialCircle | null>;
  deleteCircle: (circleId: string) => Promise<void>;
  fetchMembers: (circleId: string) => Promise<void>;
  addMember: (circleId: string, userId: string) => Promise<void>;
  removeMember: (circleId: string, userId: string) => Promise<void>;
  setActiveCircle: (circle: SocialCircle | null) => void;
}

export const useCirclesStore = create<CirclesState>((set, get) => ({
  circles: [],
  activeCircle: null,
  isLoading: false,
  error: null,

  setActiveCircle: (circle) => set({ activeCircle: circle }),

  fetchCircles: async () => {
    set({ isLoading: true, error: null });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('social_circles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    set({ circles: data ?? [], isLoading: false });
  },

  createCircle: async (name, description) => {
    set({ isLoading: true, error: null });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return null; }

    const { data, error } = await supabase
      .from('social_circles')
      .insert({ owner_id: user.id, name, description })
      .select()
      .single();

    if (error) {
      set({ error: error.message, isLoading: false });
      return null;
    }
    set(s => ({ circles: [data, ...s.circles], isLoading: false }));
    return data;
  },

  deleteCircle: async (circleId) => {
    const supabase = createClient();
    const { error } = await supabase.from('social_circles').delete().eq('id', circleId);
    if (!error) {
      set(s => ({ circles: s.circles.filter(c => c.id !== circleId), activeCircle: null }));
    }
  },

  fetchMembers: async (circleId) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from('circle_members')
      .select('*, users(id, username, display_name, avatar_url, trust_score)')
      .eq('circle_id', circleId);

    if (error) { set({ error: error.message, isLoading: false }); return; }

    set(s => ({
      circles: s.circles.map(c => c.id === circleId ? { ...c, members: data ?? [] } : c),
      activeCircle: s.activeCircle?.id === circleId
        ? { ...s.activeCircle, members: data ?? [] }
        : s.activeCircle,
      isLoading: false,
    }));
  },

  addMember: async (circleId, userId) => {
    const supabase = createClient();
    const { error } = await supabase.from('circle_members').insert({ circle_id: circleId, user_id: userId });
    if (!error) { await get().fetchMembers(circleId); }
  },

  removeMember: async (circleId, userId) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId);
    if (!error) { await get().fetchMembers(circleId); }
  },
}));
