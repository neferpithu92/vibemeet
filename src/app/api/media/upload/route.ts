import { withApi, ok, Errors } from '@/lib/api';
import { z } from 'zod';

const ALLOWED_BUCKETS = ['media', 'stories', 'avatars', 'venues', 'events', 'artists'] as const;
type Bucket = typeof ALLOWED_BUCKETS[number];

// Tipi MIME consentiti per bucket
const ALLOWED_MIME: Record<Bucket, string[]> = {
  media:   ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'],
  stories: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'],
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  venues:  ['image/jpeg', 'image/png', 'image/webp'],
  events:  ['image/jpeg', 'image/png', 'image/webp'],
  artists: ['image/jpeg', 'image/png', 'image/webp'],
};

// Dimensioni massime per bucket (in bytes)
const MAX_SIZE: Record<Bucket, number> = {
  media:   50 * 1024 * 1024,  // 50 MB (video)
  stories: 50 * 1024 * 1024,
  avatars:  5 * 1024 * 1024,  // 5 MB
  venues:  10 * 1024 * 1024,
  events:  10 * 1024 * 1024,
  artists: 10 * 1024 * 1024,
};

/**
 * POST /api/media/upload
 * Upload sicuro su Supabase Storage con:
 * - Validazione bucket, MIME type, dimensione
 * - Controllo ownership per venue/event
 * - Percorso: {userId}/{uuid}.{ext}
 * Rate: 20 upload/min.
 */
export const POST = withApi(
  'media/upload',
  async (ctx, _body, _query, req) => {
    const { supabase, user } = ctx;

    // ── 1. Leggi FormData ──────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw Errors.badRequest('FormData non valido');
    }

    const file       = formData.get('file') as File | null;
    const bucketRaw  = (formData.get('bucket') as string | null) ?? 'media';
    const entityType = (formData.get('entityType') as string | null) ?? 'user';
    const entityId   = (formData.get('entityId') as string | null) ?? user.id;

    // ── 2. Validazione input ───────────────────────────────
    if (!file) throw Errors.badRequest('Nessun file fornito');

    if (!ALLOWED_BUCKETS.includes(bucketRaw as Bucket)) {
      throw Errors.badRequest(`Bucket non valido. Usa: ${ALLOWED_BUCKETS.join(', ')}`);
    }
    const bucket = bucketRaw as Bucket;

    const allowedMime = ALLOWED_MIME[bucket];
    if (!allowedMime.includes(file.type)) {
      throw Errors.badRequest(
        `Tipo file non supportato (${file.type}). Supportati: ${allowedMime.join(', ')}`
      );
    }

    if (file.size > MAX_SIZE[bucket]) {
      throw Errors.payloadTooLarge(
        `File troppo grande. Max ${Math.round(MAX_SIZE[bucket] / 1024 / 1024)} MB per bucket "${bucket}"`
      );
    }

    // ── 3. Ownership check ─────────────────────────────────
    if (entityType === 'venue' && entityId) {
      const { data: venue } = await (supabase.from('venues') as any)
        .select('owner_id')
        .eq('id', entityId)
        .single();
      if (!venue || venue.owner_id !== user.id) {
        throw Errors.forbidden('Non sei proprietario di questa venue');
      }
    } else if (entityType === 'event' && entityId) {
      const { data: event } = await (supabase.from('events') as any)
        .select('organizer_id')
        .eq('id', entityId)
        .single();
      if (!event || event.organizer_id !== user.id) {
        throw Errors.forbidden('Non sei organizzatore di questo evento');
      }
    } else if (entityType === 'user' && entityId && entityId !== user.id) {
      throw Errors.forbidden('Non puoi caricare file su profili altrui');
    }

    // ── 4. Genera path univoco ─────────────────────────────
    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

    // ── 5. Upload su Storage ───────────────────────────────
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert:      false, // Sempre nuovi file — mai sovrascrivere
        contentType: file.type,
        duplex:      'half',
      } as any);

    if (storageError) {
      console.error(`[upload] Storage error bucket=${bucket}:`, storageError.message);
      throw Errors.internal(`Upload fallito: ${storageError.message}`);
    }

    // ── 6. URL pubblico ────────────────────────────────────
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return ok({ url: publicUrl, path: filePath, bucket }, 201);
  },
  {
    auth:        true,
    maxBodySize: 55 * 1024 * 1024, // 55 MB per catch prima del parser
    rateLimit:   [20, '1m'],
  }
);
