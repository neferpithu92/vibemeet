import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { ApiError, Errors, ok } from './errors';

// ─────────────────────────────────────────────────────────────
// Tipi
// ─────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
}

export interface ApiContext {
  user: ApiUser;
  supabase: Awaited<ReturnType<typeof createClient>>;
  requestId: string;
}

export type ApiHandler<TBody = unknown, TQuery = unknown> = (
  ctx: ApiContext,
  body: TBody,
  query: TQuery,
  req: NextRequest
) => Promise<NextResponse>;

export interface RouteOptions<TBody, TQuery> {
  /** Richiede autenticazione (default: true) */
  auth?: boolean;
  /** Zod schema per il body JSON */
  bodySchema?: ZodSchema<TBody>;
  /** Zod schema per i query params */
  querySchema?: ZodSchema<TQuery>;
  /** Rate limiting: [richieste, finestra] — es. [30, '1m'] */
  rateLimit?: [number, string];
  /** Dimensione massima body in bytes (default: 1 MB) */
  maxBodySize?: number;
}

// ─────────────────────────────────────────────────────────────
// Limiter cache (in-memory singleton per route)
// ─────────────────────────────────────────────────────────────
const limiterCache = new Map<string, ReturnType<typeof createRateLimiter>>();

function getLimiter(key: string, requests: number, window: string) {
  const cacheKey = `${key}:${requests}:${window}`;
  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(cacheKey, createRateLimiter({
      requests,
      window: window as any,
    }));
  }
  return limiterCache.get(cacheKey)!;
}

// ─────────────────────────────────────────────────────────────
// Header CORS/Security per risposte API
// ─────────────────────────────────────────────────────────────
function securityHeaders(): HeadersInit {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Cache-Control': 'no-store',
  };
}

// ─────────────────────────────────────────────────────────────
// Logger strutturato
// ─────────────────────────────────────────────────────────────
export function apiLog(
  level: 'info' | 'warn' | 'error',
  route: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    route,
    message,
    ...meta,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─────────────────────────────────────────────────────────────
// Core: withApi — wrapper per route handler
// ─────────────────────────────────────────────────────────────
export function withApi<TBody = unknown, TQuery = unknown>(
  routeName: string,
  handler: ApiHandler<TBody, TQuery>,
  options: RouteOptions<TBody, TQuery> = {}
) {
  const {
    auth = true,
    bodySchema,
    querySchema,
    rateLimit,
    maxBodySize = 1024 * 1024, // 1 MB default
  } = options;

  return async function (req: NextRequest): Promise<NextResponse> {
    const requestId = crypto.randomUUID().slice(0, 8);
    const start = performance.now();

    try {
      // ── 1. Rate Limiting ───────────────────────────────────
      if (rateLimit) {
        const [requests, window] = rateLimit;
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          ?? req.headers.get('x-real-ip')
          ?? 'anonymous';
        const limiter = getLimiter(routeName, requests, window);
        const { success, remaining, reset } = await limiter.limit(`${routeName}:${ip}`);

        if (!success) {
          apiLog('warn', routeName, 'Rate limit exceeded', { ip, requestId });
          const res = Errors.rateLimited().toResponse();
          res.headers.set('Retry-After', String(Math.ceil((reset - Date.now()) / 1000)));
          res.headers.set('X-RateLimit-Remaining', '0');
          return res;
        }
      }

      // ── 2. Autenticazione ──────────────────────────────────
      const supabase = await createClient();
      let user: ApiUser | null = null;

      if (auth) {
        const { data: { user: sbUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !sbUser) {
          return Errors.unauthorized().toResponse();
        }
        user = { id: sbUser.id, email: sbUser.email ?? '' };
      } else {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (sbUser) user = { id: sbUser.id, email: sbUser.email ?? '' };
      }

      const ctx: ApiContext = {
        user: user!,
        supabase,
        requestId,
      };

      // ── 3. Validazione Body ────────────────────────────────
      let body: TBody = undefined as unknown as TBody;

      if (bodySchema) {
        // Controlla Content-Length prima di parsare
        const contentLength = Number(req.headers.get('content-length') ?? 0);
        if (contentLength > maxBodySize) {
          return Errors.payloadTooLarge().toResponse();
        }

        const contentType = req.headers.get('content-type') ?? '';
        let raw: unknown;

        try {
          if (contentType.includes('application/json')) {
            raw = await req.json();
          } else if (contentType.includes('multipart/form-data')) {
            // Per form-data usiamo il body grezzo — il caller deve usare req.formData()
            raw = {};
          } else {
            raw = await req.json().catch(() => ({}));
          }
        } catch {
          return Errors.badRequest('Body JSON non valido').toResponse();
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          const issues = parsed.error.flatten();
          apiLog('warn', routeName, 'Validation failed', { requestId, issues });
          return Errors.validation('Dati non validi', issues).toResponse();
        }
        body = parsed.data;
      }

      // ── 4. Validazione Query Params ────────────────────────
      let query: TQuery = undefined as unknown as TQuery;

      if (querySchema) {
        const params = Object.fromEntries(new URL(req.url).searchParams.entries());
        const parsed = querySchema.safeParse(params);
        if (!parsed.success) {
          return Errors.validation('Parametri URL non validi', parsed.error.flatten()).toResponse();
        }
        query = parsed.data;
      }

      // ── 5. Esegui l'handler ────────────────────────────────
      const response = await handler(ctx, body, query, req);

      // Aggiungi security headers
      const headers = securityHeaders();
      Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      response.headers.set('X-Request-Id', requestId);

      const elapsed = Math.round(performance.now() - start);
      apiLog('info', routeName, 'Request completed', {
        requestId,
        method: req.method,
        status: response.status,
        ms: elapsed,
      });

      return response;

    } catch (err: unknown) {
      // ── Gestione errori tipizzati ──────────────────────────
      if (err instanceof ApiError) {
        apiLog('warn', routeName, err.message, { requestId, code: err.code });
        return err.toResponse();
      }

      // ── Errori imprevisti ──────────────────────────────────
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      apiLog('error', routeName, `Unhandled exception: ${message}`, {
        requestId,
        stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined,
      });

      return Errors.internal().toResponse();
    }
  };
}

// ─────────────────────────────────────────────────────────────
// Helper: parsePagination dai query params
// ─────────────────────────────────────────────────────────────
export function parsePagination(query: Record<string, string>) {
  const limit  = Math.min(Math.max(Number(query.limit)  || 10, 1), 100);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

// ─────────────────────────────────────────────────────────────
// Re-export per convenienza
// ─────────────────────────────────────────────────────────────
export { ok, created, noContent } from './errors';
export { Errors, ApiError } from './errors';
