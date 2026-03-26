/**
 * MutationManager v2 — Resilience & High Throughput.
 * Buffers interaction events with localStorage persistence to survive crashes.
 * Implements exponential backoff for network retries.
 */

type InteractionType = 'view' | 'like' | 'comment' | 'share' | 'save';

interface InteractionEvent {
  user_id: string;
  post_id: string;
  author_id: string;
  type: InteractionType;
  watch_time?: number;
  affinity_inc?: number;
  timestamp: number;
}

const STORAGE_KEY = 'vibe_unflushed_interactions';
const MAX_RETRIES = 5;

class MutationManager {
  private static instance: MutationManager;
  private buffer: InteractionEvent[] = [];
  private flushInterval = 8000;
  private maxBufferSize = 20;
  private timer: NodeJS.Timeout | null = null;
  private userId: string | null = null;
  private retryCount = 0;
  private isFlushing = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.rehydrate();
    }
  }

  public static getInstance(): MutationManager {
    if (!MutationManager.instance) {
      MutationManager.instance = new MutationManager();
    }
    return MutationManager.instance;
  }

  public setUserId(id: string) {
    this.userId = id;
    // After setting user, try to flush any recovered events
    if (this.buffer.length > 0) this.flush();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.buffer));
    } catch (e) {
      console.error('[MutationManager] Storage save failed:', e);
    }
  }

  private rehydrate() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.buffer = parsed;
          console.log(`[MutationManager] Rehydrated ${this.buffer.length} events.`);
        }
      }
    } catch (e) {
      console.error('[MutationManager] Rehydration failed:', e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  public record(event: Omit<InteractionEvent, 'user_id' | 'timestamp'>) {
    if (!this.userId) {
      // If user not set yet, we still buffer but can't record user_id. 
      // We'll update user_id on flush if available.
      console.warn('[MutationManager] Recording without userId. Will attempt recovery on flush.');
    }

    const fullEvent: InteractionEvent = {
      ...event,
      user_id: this.userId || 'pending',
      timestamp: Date.now(),
    };

    this.buffer.push(fullEvent);
    this.saveToStorage();

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  public async flush() {
    if (this.isFlushing || this.buffer.length === 0 || !this.userId) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.isFlushing = true;

    // Ensure all pending events have the correct userId
    const itemsToFlush = this.buffer.map(ev => ({
      ...ev,
      user_id: ev.user_id === 'pending' ? this.userId! : ev.user_id
    }));

    // Temporary clear for retry logic
    const backupBuffer = [...this.buffer];
    this.buffer = [];
    this.saveToStorage();

    try {
      const response = await fetch('/api/social/batch-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interactions: itemsToFlush }),
      });

      if (response.ok) {
        this.retryCount = 0;
        console.log(`[MutationManager] Successfully flushed ${itemsToFlush.length} events.`);
      } else {
        throw new Error(response.statusText);
      }
    } catch (err) {
      this.retryCount++;
      console.error(`[MutationManager] Flush failed (Attempt ${this.retryCount}):`, err);

      // Putting back in buffer
      this.buffer = [...backupBuffer, ...this.buffer].slice(-100); // Limit total buffer to 100
      this.saveToStorage();

      if (this.retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, this.retryCount) * 1000;
        this.timer = setTimeout(() => this.flush(), delay);
      }
    } finally {
      this.isFlushing = false;
    }
  }
}

export const mutationManager = MutationManager.getInstance();
