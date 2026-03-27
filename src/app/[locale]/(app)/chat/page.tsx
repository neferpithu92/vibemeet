'use client';

import { useState } from 'react';
import { ChatList } from '@/components/social/ChatList';
import { ChatWindow } from '@/components/social/ChatWindow';

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 p-4 md:p-6 overflow-hidden">
      {/* Sidebar List */}
      <div className={`w-full md:w-80 flex-shrink-0 bg-white/5 border border-white/10 rounded-3xl p-4 overflow-y-auto ${
        selectedConversationId ? 'hidden md:block' : 'block'
      }`}>
        <ChatList onSelect={setSelectedConversationId} />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 min-w-0 ${
        selectedConversationId ? 'block' : 'hidden md:flex items-center justify-center'
      }`}>
        {selectedConversationId ? (
          <ChatWindow 
            conversationId={selectedConversationId} 
            onBack={() => setSelectedConversationId(null)} 
          />
        ) : (
          <div className="text-center space-y-4 opacity-30">
            <div className="w-20 h-20 mx-auto rounded-full bg-vibe-gradient flex items-center justify-center">
              <span className="text-4xl">💬</span>
            </div>
            <p className="font-bold text-white uppercase tracking-widest text-sm">Seleziona una conversazione</p>
          </div>
        )}
      </div>
    </div>
  );
}
