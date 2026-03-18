'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';

interface HashtagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

/**
 * HashtagInput — Textarea-style input that parses #hashtags live
 * with autocomplete dropdown for trending tags.
 */
export function HashtagInput({
  value = [],
  onChange,
  maxTags = 30,
  placeholder = 'Aggiungi hashtag... (es. #techno #zurichnight)',
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ tag: string; post_count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch trending hashtag suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch(`/api/hashtags/trending?q=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.hashtags || []);
        setShowSuggestions(true);
      }
    } catch {
      // Fallback: don't show suggestions on error
      setSuggestions([]);
    }
  }, []);

  // Handle input changes with debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    // Extract the current hashtag being typed
    const hashMatch = raw.match(/#(\w+)$/);
    if (hashMatch) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(hashMatch[1]);
      }, 300);
    } else {
      setShowSuggestions(false);
    }
  };

  // Add a tag
  const addTag = (tag: string) => {
    const cleaned = tag.toLowerCase().replace(/[^a-z0-9_àèéìòùü]/g, '');
    if (!cleaned || value.includes(cleaned) || value.length >= maxTags) return;

    onChange([...value, cleaned]);
    setInputValue('');
    setShowSuggestions(false);
    setActiveSuggestion(0);
    inputRef.current?.focus();
  };

  // Remove a tag
  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        addTag(suggestions[activeSuggestion].tag);
      } else {
        // Parse hashtags from input
        const tags = inputValue.match(/#(\w+)/g);
        if (tags) {
          tags.forEach((t) => addTag(t.replace('#', '')));
        }
      }
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setActiveSuggestion((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === ' ') {
      // Space after a hashtag → add it
      const hashMatch = inputValue.match(/#(\w+)$/);
      if (hashMatch) {
        e.preventDefault();
        addTag(hashMatch[1]);
      }
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = () => setShowSuggestions(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="relative">
      {/* Tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-vibe-purple/20 text-vibe-purple group cursor-pointer hover:bg-vibe-purple/30 transition-colors"
            onClick={() => removeTag(tag)}
          >
            #{tag}
            <svg
              className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length >= maxTags ? `Massimo ${maxTags} hashtag` : placeholder}
          disabled={value.length >= maxTags}
          className="input-field text-sm"
          onClick={(e) => e.stopPropagation()}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-vibe-text-secondary">
          {value.length}/{maxTags}
        </span>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 glass-card rounded-xl overflow-hidden shadow-xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {suggestions.map((s, idx) => (
            <button
              key={s.tag}
              onClick={() => addTag(s.tag)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                idx === activeSuggestion
                  ? 'bg-vibe-purple/20 text-vibe-purple'
                  : 'hover:bg-white/5 text-vibe-text'
              }`}
            >
              <span className="text-sm font-medium">#{s.tag}</span>
              <span className="text-xs text-vibe-text-secondary">
                {s.post_count.toLocaleString()} post
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
