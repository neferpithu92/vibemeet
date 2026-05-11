/**
 * useApi — Hook client per chiamate alle API VibeMeet.
 * 
 * Fornisce:
 * - Tipizzazione completa delle risposte
 * - Gestione errori uniforme con ApiError
 * - Retry automatico su 503/429
 * - Integrazione con il formato risposta { success, data, error }
 */

// ─────────────────────────────────────────────────────────────
// Tipi risposta dal server
// ─────────────────────────────────────────────────────────────
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─────────────────────────────────────────────────────────────
// Errore client
// ─────────────────────────────────────────────────────────────
export class ClientApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name    = 'ClientApiError';
    this.code    = code;
    this.status  = status;
    this.details = details;
  }

  get isUnauthorized()    { return this.status === 401; }
  get isRateLimited()     { return this.status === 429; }
  get isValidationError() { return this.status === 422; }
  get isNotFound()        { return this.status === 404; }
  get isServerError()     { return this.status >= 500; }
}

// ─────────────────────────────────────────────────────────────
// Configurazione fetch
// ─────────────────────────────────────────────────────────────
interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Retry automatico su 503 (default: 1) */
  retries?: number;
  /** Delay tra retry in ms (default: 800) */
  retryDelay?: number;
}

// ─────────────────────────────────────────────────────────────
// Core fetcher
// ─────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
  attempt = 0
): Promise<T> {
  const {
    body,
    params,
    retries    = 1,
    retryDelay = 800,
    ...rest
  } = options;

  // Costruisci URL con query params
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  // Prepara headers e body
  const isFormData = body instanceof FormData;
  const fetchInit: RequestInit = {
    credentials: 'include',
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...rest.headers,
    },
    body: isFormData
      ? body
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  };

  let response: Response;
  try {
    response = await fetch(url.toString(), fetchInit);
  } catch (networkErr) {
    throw new ClientApiError(
      'NETWORK_ERROR',
      'Errore di rete — controlla la connessione',
      0
    );
  }

  // Retry su 503 Service Unavailable
  if (response.status === 503 && attempt < retries) {
    await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
    return apiFetch<T>(path, options, attempt + 1);
  }

  // Rate limiting — estrai Retry-After
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new ClientApiError(
      'RATE_LIMITED',
      `Troppe richieste${retryAfter ? ` — riprova tra ${retryAfter}s` : ''}`,
      429
    );
  }

  // Prova a parsare il JSON
  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ClientApiError(
      'PARSE_ERROR',
      `Risposta non valida dal server (HTTP ${response.status})`,
      response.status
    );
  }

  // Errore strutturato dal server
  if (!json.success) {
    const err = (json as ApiErrorResponse).error;
    throw new ClientApiError(
      err.code    ?? 'UNKNOWN',
      err.message ?? 'Errore sconosciuto',
      response.status,
      err.details
    );
  }

  return (json as ApiSuccessResponse<T>).data;
}

// ─────────────────────────────────────────────────────────────
// API Client — metodi tipizzati
// ─────────────────────────────────────────────────────────────
export const api = {
  // ── Media ────────────────────────────────────────────────
  media: {
    upload: (formData: FormData) =>
      apiFetch<{ url: string; path: string; bucket: string }>('/api/media/upload', {
        method:  'POST',
        body:    formData,
        retries: 2,
      }),

    publish: (data: {
      url: string;
      type: 'photo' | 'video' | 'reel' | 'story';
      caption?: string;
      hashtags?: string[];
      filter?: string;
      visibility?: 'public' | 'private' | 'friends';
      location_lat?: number;
      location_lng?: number;
      location_name?: string;
    }) =>
      apiFetch<{ media: Record<string, unknown> }>('/api/media/publish', {
        method: 'POST',
        body:   data,
      }),
  },

  // ── Feed ─────────────────────────────────────────────────
  feed: {
    forYou: (params?: { limit?: number; offset?: number; type?: string }) =>
      apiFetch<{ items: any[]; nextCursor: string | null }>('/api/feed/foryou', {
        params: params as any,
      }),
  },

  // ── Social ───────────────────────────────────────────────
  social: {
    like: (entityId: string, entityType: string, action: 'like' | 'unlike') =>
      apiFetch<{ liked: boolean; likeCount: number }>('/api/social/like', {
        method: 'POST',
        body:   { entityId, entityType, action },
      }),

    follow: (targetId: string, action: 'follow' | 'unfollow', entityType = 'user') =>
      apiFetch<{ following: boolean; pending?: boolean; message: string }>('/api/social/follow', {
        method: 'POST',
        body:   { targetId, entityType, action },
      }),

    batchInteractions: (interactions: any[]) =>
      apiFetch<{ success: boolean; processed: number }>('/api/social/batch-interactions', {
        method: 'POST',
        body:   { interactions },
      }),
  },

  // ── Notifications ─────────────────────────────────────────
  notifications: {
    list: (params?: { limit?: number; offset?: number }) =>
      apiFetch<{ notifications: any[]; unreadCount: number }>('/api/notifications', {
        params: params as any,
      }),

    markRead: (notificationId: string) =>
      apiFetch<{ updated: boolean }>('/api/notifications', {
        method: 'PATCH',
        body:   { notificationId },
      }),

    markAllRead: () =>
      apiFetch<{ updated: boolean }>('/api/notifications', {
        method: 'PATCH',
        body:   { markAll: true },
      }),

    delete: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/notifications`, {
        method: 'DELETE',
        params: { id },
      }),
  },

  // ── Discovery ─────────────────────────────────────────────
  discovery: {
    search: (q: string, params?: { limit?: number; type?: string }) =>
      apiFetch<{
        users: any[]; events: any[]; venues: any[];
        artists: any[]; hashtags: any[]; total: number;
      }>('/api/discovery/search', {
        params: { q, ...params } as any,
      }),
  },

  // ── Events ────────────────────────────────────────────────
  events: {
    create: (data: {
      title: string;
      description: string;
      category: string;
      venue_id?: string;
      starts_at: string;
      ends_at?: string;
      cover_url?: string;
      ticket_price?: number;
      address?: string;
      location_lat?: number;
      location_lng?: number;
      max_attendees?: number;
    }) =>
      apiFetch<{ event: Record<string, unknown> }>('/api/events/create', {
        method: 'POST',
        body: data,
      }),
  },

  // ── Profile ───────────────────────────────────────────────
  profile: {
    me: () => 
      apiFetch<{
        profile: any;
        media: any[];
        check_ins: any[];
        tickets: any[];
      }>('/api/profile/me'),
      
    get: (username: string) =>
      apiFetch<{
        profile: any;
        is_following: boolean;
        can_view_content: boolean;
        media: any[];
      }>(`/api/profile/${username}`),
  },
};

// ─────────────────────────────────────────────────────────────
// Hook React — con stato loading/error
// ─────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';

interface UseApiState<T> {
  data:      T | null;
  isLoading: boolean;
  error:     ClientApiError | null;
}

export function useApiCall<T>(
  fn: (...args: any[]) => Promise<T>
): [UseApiState<T>, (...args: any[]) => Promise<T | null>] {
  const [state, setState] = useState<UseApiState<T>>({
    data:      null,
    isLoading: false,
    error:     null,
  });

  const call = useCallback(async (...args: any[]): Promise<T | null> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await fn(...args);
      setState({ data: result, isLoading: false, error: null });
      return result;
    } catch (err) {
      const apiErr = err instanceof ClientApiError
        ? err
        : new ClientApiError('UNKNOWN', String(err), 0);
      setState(s => ({ ...s, isLoading: false, error: apiErr }));
      return null;
    }
  }, [fn]);

  return [state, call];
}
