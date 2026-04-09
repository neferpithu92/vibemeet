import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface PointTransaction {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
}

interface WalletState {
  balance: number;
  transactions: PointTransaction[];
  isLoading: boolean;
  
  fetchWallet: () => Promise<void>;
  claimDailyReward: () => Promise<boolean>;
  spendPoints: (amount: number, reason: string) => Promise<boolean>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  transactions: [],
  isLoading: false,

  fetchWallet: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ isLoading: false }); return; }

    // 1. Get Balance
    const { data: userData } = await supabase
      .from('users')
      .select('vibe_points')
      .eq('id', user.id)
      .single();
    
    // 2. Get Transactions
    const { data: txs } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    set({ 
      balance: userData?.vibe_points || 0, 
      transactions: txs || [],
      isLoading: false 
    });
  },

  claimDailyReward: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Call RPC from 050
    const { data: newBalance, error } = await supabase.rpc('adjust_vibe_points', {
      p_user_id: user.id,
      p_amount: 50,
      p_reason: 'daily_checkin'
    });

    if (error) {
      console.error('Reward error:', error);
      return false;
    }

    await get().fetchWallet();
    return true;
  },

  spendPoints: async (amount: number, reason: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: newBalance, error } = await supabase.rpc('adjust_vibe_points', {
      p_user_id: user.id,
      p_amount: -Math.abs(amount),
      p_reason: reason
    });

    if (error) {
       console.error('Spend error:', error);
       return false;
    }

    await get().fetchWallet();
    return true;
  }
}));
