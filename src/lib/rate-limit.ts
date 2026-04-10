import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

/**
 * Fallback cache if Redis credentials aren't provided.
 * Does not replicate across edge nodes, but prevents app crash.
 */
const fallbackCache = new Map();

// Verify credentials
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const isRedisConfigured = !!UPSTASH_REDIS_REST_URL && !!UPSTASH_REDIS_REST_TOKEN;

/**
 * Factory che ritorna un ratelimiter.
 * Se Upstash non è configurato, usa il Map Cache locale.
 */
export const createRateLimiter = (options: { requests: number, window: import('@upstash/ratelimit').Duration }) => {
  if (isRedisConfigured) {
    const redis = new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
    return new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(options.requests, options.window),
      analytics: true
    });
  }
  
  // Minimal fallback implementation
  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const windowMs = parseDurationToMs(options.window);
      
      const record = fallbackCache.get(identifier) || { count: 0, resetTime: now + windowMs };
      
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count += 1;
      }
      
      fallbackCache.set(identifier, record);
      
      return {
        success: record.count <= options.requests,
        limit: options.requests,
        remaining: Math.max(0, options.requests - record.count),
        reset: record.resetTime
      };
    }
  };
};

export const rateLimitResponse = () => {
    return NextResponse.json({ error: 'Too Many Requests', success: false }, { status: 429 });
};

// Helper to convert Upstash duration to local Map MS
function parseDurationToMs(duration: string): number {
    const time = parseInt(duration);
    const unit = duration.replace(/[0-9]/g, '').trim();
    if (unit === 's') return time * 1000;
    if (unit === 'm') return time * 60000;
    if (unit === 'h') return time * 3600000;
    return 10000; // default 10s
}
