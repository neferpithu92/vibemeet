'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Send, Heart, MoreHorizontal } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';

interface Story {
  id: string;
  media_url: string;
  type: string;
  caption?: string;
}

interface UserStoryGroup {
  id: string;
  username: string;
  avatar_url?: string;
  stories: Story[];
}

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  userGroups: UserStoryGroup[];
  initialUserIndex?: number;
}

export default function StoryViewer({ isOpen, onClose, userGroups, initialUserIndex = 0 }: StoryViewerProps) {
  const [currentUserIndex, setCurrentUserIndex] = useState(initialUserIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentUser = userGroups[currentUserIndex];
  const currentStory = currentUser?.stories[currentStoryIndex];

  useEffect(() => {
    if (!isOpen) return;

    const duration = 5000; // 5 seconds per story
    const interval = 50; // update progress every 50ms
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, currentUserIndex, currentStoryIndex]);

  const handleNextStory = () => {
    if (currentStoryIndex < currentUser.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
      setProgress(0);
    } else if (currentUserIndex < userGroups.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
      setProgress(0);
    } else if (currentUserIndex > 0) {
      setCurrentUserIndex(prev => prev - 1);
      setCurrentStoryIndex(userGroups[currentUserIndex - 1].stories.length - 1);
      setProgress(0);
    }
  };

  if (!isOpen || !currentUser) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        <div className="relative w-full max-w-[450px] aspect-[9/16] bg-vibe-dark overflow-hidden md:rounded-3xl shadow-2xl">
          {/* Progress Bars */}
          <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
            {currentUser.stories.map((_, idx) => (
              <div key={idx} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75" 
                  style={{ 
                    width: idx === currentStoryIndex ? `${progress}%` : idx < currentStoryIndex ? '100%' : '0%' 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar size="sm" src={currentUser.avatar_url} fallback={currentUser.username[0]} />
              <div className="flex flex-col">
                <span className="text-white text-sm font-bold shadow-sm">{currentUser.username}</span>
                <span className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Live Now</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-white p-1"><MoreHorizontal size={20} /></button>
              <button 
                onClick={onClose}
                className="text-white p-1 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="w-full h-full">
            {currentStory.type === 'video' ? (
              <video 
                src={currentStory.media_url} 
                className="w-full h-full object-cover" 
                autoPlay 
                muted 
                playsInline
              />
            ) : (
              <img 
                src={currentStory.media_url} 
                alt="Story" 
                className="w-full h-full object-cover" 
              />
            )}
          </div>

          {/* Navigation Tap Zones */}
          <div className="absolute inset-x-0 inset-y-20 z-10 flex">
            <div className="flex-1 cursor-pointer" onClick={handlePrevStory} />
            <div className="flex-1 cursor-pointer" onClick={handleNextStory} />
          </div>

          {/* Footer Actions */}
          <div className="absolute bottom-8 left-4 right-4 z-20 flex items-center gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Invia un messaggio..."
                className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:bg-white/20 transition-all placeholder:text-white/40"
              />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
                <Send size={18} />
              </button>
            </div>
            <button className="text-white hover:text-vibe-pink transition-all active:scale-125">
              <Heart size={24} />
            </button>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex absolute inset-x-0 pointer-events-none justify-between px-10">
           <button 
             onClick={handlePrevStory}
             className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
           >
             <ChevronLeft size={32} />
           </button>
           <button 
             onClick={handleNextStory}
             className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
           >
             <ChevronRight size={32} />
           </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
