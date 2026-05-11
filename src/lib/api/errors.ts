import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// Codici di errore semantici
// ─────────────────────────────────────────────────────────────
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'PAYLOAD_TOO_LARGE';

const HTTP_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED:        401,
  FORBIDDEN:           403,
  NOT_FOUND:           404,
  BAD_REQUEST:         400,
  VALIDATION_ERROR:    422,
  RATE_LIMITED:        429,
  CONFLICT:            409,
  INTERNAL_ERROR:      500,
  SERVICE_UNAVAILABLE: 503,
  PAYLOAD_TOO_LARGE:   413,
};

// ─────────────────────────────────────────────────────────────
// Classe base
// ─────────────────────────────────────────────────────────────
export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = HTTP_STATUS[code];
    this.details = details;
  }

  toResponse() {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: this.code,
          message: this.message,
          ...(this.details !== undefined && { details: this.details }),
        },
      },
      { status: this.status }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Factory helpers — usare questi nelle API
// ─────────────────────────────────────────────────────────────
export const Errors = {
  unauthorized:    (msg = 'Devi essere autenticato')           => new ApiError('UNAUTHORIZED', msg),
  forbidden:       (msg = 'Accesso non consentito')            => new ApiError('FORBIDDEN', msg),
  notFound:        (msg = 'Risorsa non trovata')               => new ApiError('NOT_FOUND', msg),
  badRequest:      (msg: string, details?: unknown)            => new ApiError('BAD_REQUEST', msg, details),
  validation:      (msg: string, details?: unknown)            => new ApiError('VALIDATION_ERROR', msg, details),
  rateLimited:     (msg = 'Troppe richieste, riprova tra poco') => new ApiError('RATE_LIMITED', msg),
  conflict:        (msg: string)                               => new ApiError('CONFLICT', msg),
  internal:        (msg = 'Errore interno del server')         => new ApiError('INTERNAL_ERROR', msg),
  serviceDown:     (msg = 'Servizio temporaneamente non disponibile') => new ApiError('SERVICE_UNAVAILABLE', msg),
  payloadTooLarge: (msg = 'File troppo grande')                => new ApiError('PAYLOAD_TOO_LARGE', msg),
} as const;

// ─────────────────────────────────────────────────────────────
// Risposta di successo uniforme
// ─────────────────────────────────────────────────────────────
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
