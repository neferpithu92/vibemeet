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

    try {
      // 1. Get Balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('vibe_points')
        .eq('id', user.id)
        .single();
      
      if (userError) console.error('[Wallet] Error fetching balance:', userError);

      // 2. Get Transactions
      const { data: txs, error: txError } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txError) console.error('[Wallet] Error fetching transactions:', txError);

      set({ 
        balance: userData?.vibe_points || 0, 
        transactions: (txs as PointTransaction[]) || [],
        isLoading: false 
      });
    } catch (err) {
      console.error('[Wallet] Fatal fetch error:', err);
      set({ isLoading: false });
    }
  },

  claimDailyReward: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    console.log('[Wallet] Claiming daily reward for:', user.id);

    // Call RPC from 050/Master Sync
    const { data: newBalance, error } = await supabase.rpc('adjust_vibe_points', {
      p_user_id: user.id,
      p_amount: 50,
      p_reason: 'daily_checkin',
      p_metadata: {}
    });

    if (error) {
      console.error('[Wallet] Reward error:', error);
      return false;
    }

    await get().fetchWallet();
    return true;
  },

  spendPoints: async (amount: number, reason: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    console.log('[Wallet] Spending points:', { amount, reason });

    const { data: newBalance, error } = await supabase.rpc('adjust_vibe_points', {
      p_user_id: user.id,
      p_amount: -Math.abs(amount),
      p_reason: reason,
      p_metadata: {}
    });

    if (error) {
       console.error('[Wallet] Spend error:', error);
       return false;
    }

    await get().fetchWallet();
    return true;
  }
}));
