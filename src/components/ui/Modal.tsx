'use client';

import React, { useEffect } from 'react';
import { Card } from './Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-vibe-dark/60 backdrop-blur-md animate-fade-in" 
        onClick={onClose} 
      />
      <Card className={`relative w-full p-6 animate-slide-in-bottom shadow-2xl border-white/10 ${
        size === 'sm' ? 'max-w-sm' :
        size === 'md' ? 'max-w-md' :
        size === 'lg' ? 'max-w-lg' :
        size === 'xl' ? 'max-w-4xl' :
        'max-w-[95vw] h-[90vh]'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button 
            onClick={onClose}
            className="text-vibe-text-secondary hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}
