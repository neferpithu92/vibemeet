'use client';

import React from 'react';
import { ShieldCheck, User, Key, Mail, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Link } from '@/lib/i18n/navigation';

interface AccountCenterProps {
  user: {
    display_name: string;
    username: string;
    avatar_url?: string;
    email?: string;
  };
}

export function AccountCenter({ user }: AccountCenterProps) {
  return (
    <Card className="p-0 overflow-hidden border-vibe-purple/20 bg-gradient-to-br from-vibe-purple/10 to-transparent group mb-8">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-vibe-purple flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">V</span>
            </div>
            <h3 className="text-xs font-bold text-vibe-text-secondary uppercase tracking-widest">Account Center</h3>
          </div>
          <span className="text-[10px] font-bold text-vibe-purple bg-vibe-purple/10 px-2 py-0.5 rounded-full">Protetto</span>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Avatar 
                size="lg" 
                src={user.avatar_url} 
                fallback={user.display_name[0] || 'U'} 
                className="border-2 border-vibe-purple/30 group-hover:scale-105 transition-transform" 
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-vibe-purple border-2 border-vibe-dark flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h4 className="font-display text-lg font-black">{user.display_name}</h4>
            <p className="text-xs text-vibe-text-secondary">@{user.username}</p>
          </div>
        </div>

        <div className="space-y-1">
          <Link href="/settings?tab=account" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <Key className="w-4 h-4 text-vibe-text-secondary" />
              <span className="text-xs font-bold">Password e Sicurezza</span>
            </div>
            <ChevronRight className="w-4 h-4 text-vibe-text-secondary/40" />
          </Link>
          <Link href="/settings?tab=account" className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-vibe-text-secondary" />
              <span className="text-xs font-bold text-vibe-text-secondary">{user.email || 'Email non impostata'}</span>
            </div>
            <span className="text-[9px] font-bold text-vibe-cyan border border-vibe-cyan/30 px-1.5 py-0.5 rounded">Verificata</span>
          </Link>
        </div>
      </div>
      
      <div className="bg-vibe-purple/10 p-3 flex items-center justify-center">
         <p className="text-[9px] text-vibe-text-secondary font-medium flex items-center gap-1.5 uppercase tracking-tighter">
            <ShieldCheck className="w-3 h-3 text-vibe-purple" /> 
            Controlla le tue impostazioni su tutte le app Vibe
         </p>
      </div>
    </Card>
  );
}
