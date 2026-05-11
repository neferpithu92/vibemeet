import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Primitivi riusabili
// ─────────────────────────────────────────────────────────────
const uuid    = () => z.string().uuid('ID non valido');
const shortStr = (max = 300) => z.string().min(1).max(max).trim();
const optStr  = (max = 300) => z.string().max(max).trim().optional();
const paginationParams = {
  limit:  z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
};

// ─────────────────────────────────────────────────────────────
// Auth / User
// ─────────────────────────────────────────────────────────────
export const userProfileSchema = z.object({
  username:     z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username non valido — solo lettere, numeri e _'),
  display_name: shortStr(100),
  bio:          optStr(500),
  language:     z.enum(['it', 'en', 'de', 'fr', 'rm']).optional(),
  account_type: z.enum(['public', 'private']).optional(),
});

export const emailSchema     = z.string().email('Email non valida');
export const passwordSchema  = z.string().min(8, 'Almeno 8 caratteri').regex(/[A-Z]/, 'Almeno una maiuscola').regex(/[0-9]/, 'Almeno un numero');

// ─────────────────────────────────────────────────────────────
// Feed / Media
// ─────────────────────────────────────────────────────────────
export const feedQuerySchema = z.object({
  ...paginationParams,
  type: z.enum(['posts', 'reels', 'stories']).optional(),
});

export const mediaPublishSchema = z.object({
  url:           z.string().url('URL non valido'),
  type:          z.enum(['photo', 'video', 'reel', 'story']),
  caption:       optStr(2200),
  hashtags:      z.array(z.string().max(100)).max(30).optional(),
  filter:        optStr(50),
  visibility:    z.enum(['public', 'private', 'friends']).default('public'),
  location_lat:  z.number().min(-90).max(90).optional(),
  location_lng:  z.number().min(-180).max(180).optional(),
  location_name: optStr(200),
});

// ─────────────────────────────────────────────────────────────
// Social
// ─────────────────────────────────────────────────────────────
export const followSchema = z.object({
  targetId:   uuid(),
  entityType: z.enum(['user', 'venue', 'artist']).default('user'),
  action:     z.enum(['follow', 'unfollow']),
});

export const likeSchema = z.object({
  entityId:   uuid(),
  entityType: z.enum(['media', 'post', 'comment', 'event']),
  action:     z.enum(['like', 'unlike']),
});

export const commentSchema = z.object({
  entityId:   uuid(),
  entityType: z.enum(['media', 'event']).default('media'),
  body:       shortStr(1000),
});

export const shareSchema = z.object({
  entityId:   uuid(),
  entityType: z.enum(['media', 'event', 'venue', 'artist']),
  message:    optStr(500),
});

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────
export const notificationCreateSchema = z.object({
  user_id:     uuid(),
  actor_id:    uuid().optional(),
  type:        z.enum(['follow', 'like', 'comment', 'mention', 'event', 'system', 'checkin']),
  entity_type: z.enum(['user', 'media', 'event', 'venue', 'system']).default('system'),
  entity_id:   uuid().optional(),
  message:     shortStr(500),
});

export const notificationPatchSchema = z.object({
  notificationId: uuid().optional(),
  markAll:        z.boolean().optional(),
}).refine(d => d.notificationId || d.markAll, 'Specificare notificationId o markAll=true');

// ─────────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────────
export const eventCreateSchema = z.object({
  title:       shortStr(200),
  description: shortStr(5000),
  category:    z.enum(['party', 'concert', 'lounge', 'festival', 'workshop', 'sport', 'art', 'other']),
  venue_id:    uuid().optional(),
  starts_at:   z.string().datetime({ message: 'Data inizio non valida' }),
  ends_at:     z.string().datetime().optional(),
  ticket_price: z.number().min(0).default(0),
  cover_url:   z.string().url().optional(),
  address:     optStr(500),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lng: z.number().min(-180).max(180).optional(),
  max_attendees: z.number().int().min(1).optional(),
});

// ─────────────────────────────────────────────────────────────
// Messages / Chat
// ─────────────────────────────────────────────────────────────
export const messageSchema = z.object({
  recipient_id: uuid(),
  content:      shortStr(5000),
  media_url:    z.string().url().optional(),
});

// ─────────────────────────────────────────────────────────────
// Discovery / Search
// ─────────────────────────────────────────────────────────────
export const searchQuerySchema = z.object({
  q:     z.string().min(2, 'Query troppo corta').max(100).trim(),
  limit: z.coerce.number().int().min(1).max(50).default(8),
  type:  z.enum(['users', 'events', 'venues', 'artists', 'all']).default('all'),
});

// ─────────────────────────────────────────────────────────────
// Batch Interactions (FYP tracking)
// ─────────────────────────────────────────────────────────────
const interactionItem = z.object({
  post_id:     uuid(),
  type:        z.enum(['view', 'like', 'comment', 'share', 'save', 'skip']),
  watch_time:  z.number().min(0).max(7200).default(0),
  affinity_inc: z.number().min(0).max(1).default(0),
});

export const batchInteractionsSchema = z.object({
  interactions: z.array(interactionItem).min(1).max(50),
});

// ─────────────────────────────────────────────────────────────
// Check-in
// ─────────────────────────────────────────────────────────────
export const checkinSchema = z.object({
  venue_id: uuid().optional(),
  event_id: uuid().optional(),
  lat:      z.number().min(-90).max(90).optional(),
  lng:      z.number().min(-180).max(180).optional(),
}).refine(d => d.venue_id || d.event_id, 'Specificare venue_id o event_id');
