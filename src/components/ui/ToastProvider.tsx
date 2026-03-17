'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], icon?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', icon?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    
    // Rimuovi dopo 5 secondi
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast UI Overlay */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slide-in-right glass-card-hover p-4 flex items-center gap-3 min-w-[280px] border-white/10 shadow-2xl"
          >
            <div className="text-xl">
              {toast.icon || (toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '🔔')}
            </div>
            <p className="text-sm font-medium text-white">{toast.message}</p>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-auto text-vibe-text-secondary hover:text-white"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve essere usato dentro un ToastProvider');
  }
  return context;
}
