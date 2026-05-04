'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Check initial theme from document or localStorage
    const savedTheme = localStorage.getItem('vibe-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || (document.documentElement.classList.contains('light') ? 'light' : 'dark');
    setTheme(initialTheme);
    
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('vibe-theme', newTheme);
    
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all tap-bounce flex items-center justify-center overflow-hidden w-10 h-10"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: 20, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -20, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.2, ease: "circOut" }}
          className="flex items-center justify-center"
        >
          {theme === 'dark' ? (
            <Moon className="w-5 h-5 text-vibe-cyan" />
          ) : (
            <Sun className="w-5 h-5 text-vibe-pink" />
          )}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
