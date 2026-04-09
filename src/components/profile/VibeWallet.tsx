'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/stores/useWalletStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, History, Sparkles, Gift, Zap, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

export default function VibeWallet() {
  const { balance, transactions, isLoading, fetchWallet, claimDailyReward } = useWalletStore();
  const [isclaiming, setIsClaiming] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const handleClaim = async () => {
    setIsClaiming(true);
    const success = await claimDailyReward();
    if (success) {
      showToast('Daily Reward riscattata! +50 Vibe Coins', 'success', '✨');
    } else {
      showToast('Torni domani per un nuovo premio!', 'info');
    }
    setIsClaiming(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Balance Card - Premium Design */}
      <Card className="p-0 overflow-hidden bg-vibe-dark/40 border-vibe-purple/20 relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-vibe-purple/20 blur-[100px] -mr-32 -mt-32 group-hover:bg-vibe-pink/20 transition-all duration-1000" />
        <div className="p-8 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-vibe-purple">
              <Wallet className="w-6 h-6" />
            </div>
            <Badge variant="premium" className="px-4 py-1.5 text-[10px] tracking-[0.2em]">PLATINUM WALLET</Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-bold text-vibe-purple uppercase tracking-[0.3em]">Bilancio Disponibile</p>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-display font-black text-white glow-text tracking-tighter">
                {balance.toLocaleString()}
              </span>
              <span className="text-2xl font-display font-bold text-vibe-purple mb-2">VIBE</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-12">
            <Button 
                variant="primary" 
                className="h-14 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-vibe-purple/20"
                onClick={handleClaim}
                disabled={isclaiming}
            >
              <Gift className="w-5 h-5" /> 
              {isclaiming ? 'Riscattando...' : 'Daily Reward'}
            </Button>
            <Button 
                variant="secondary" 
                className="h-14 rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" /> Buy Coins
            </Button>
          </div>
        </div>
      </Card>

      {/* Feature Section: BOOST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 bg-gradient-to-br from-vibe-purple/10 to-transparent border-vibe-purple/20 hover:scale-105 transition-all cursor-pointer group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-vibe-purple/20 flex items-center justify-center text-vibe-purple group-hover:animate-pulse">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white tracking-tight text-lg">Auto-Boost Feed</h3>
          </div>
          <p className="text-xs text-white/40 mb-6">Metti il tuo prossimo post in cima al feed for-you per 4 ore.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-vibe-purple">500 VIBE</span>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-vibe-cyan/10 to-transparent border-vibe-cyan/20 hover:scale-105 transition-all cursor-pointer group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-vibe-cyan/20 flex items-center justify-center text-vibe-cyan group-hover:animate-bounce">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white tracking-tight text-lg">Spotlight Venue</h3>
          </div>
          <p className="text-xs text-white/40 mb-6">Fatti notare sulla mappa con un'animazione dedicata per 24h.</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-vibe-cyan">1200 VIBE</span>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </div>
        </Card>
      </div>

      {/* Transactions History */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
          <History className="w-4 h-4" /> Storico Transazioni
        </h2>
        <div className="space-y-2">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {tx.amount > 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{tx.reason === 'daily_checkin' ? 'Check-in Giornaliero' : tx.reason}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {tx.amount > 0 ? '+' : ''}{tx.amount} VIBE
              </span>
            </div>
          ))}
          {transactions.length === 0 && !isLoading && (
            <div className="py-20 text-center opacity-10">
              <Zap className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">Nessun movimento</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
