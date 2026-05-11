import { withApi, ok, Errors } from '@/lib/api';
import { eventCreateSchema } from '@/lib/api/schemas';

/**
 * API per creare un nuovo evento.
 * Usa il pattern withApi per validazione e sicurezza.
 */
export const POST = withApi(
  'events/create',
  async (ctx, body) => {
    const { 
      title, 
      description, 
      category, 
      venue_id, 
      starts_at, 
      ends_at, 
      cover_url, 
      ticket_price, 
      address,
      location_lat,
      location_lng,
      max_attendees
    } = body;

    // Security Check: Verify user owns the venue if provided
    if (venue_id) {
      const { data: venue, error: venueError } = await ctx.supabase
        .from('venues')
        .select('owner_id, location, address')
        .eq('id', venue_id)
        .single();

      if (venueError || !venue || venue.owner_id !== ctx.user.id) {
        throw Errors.forbidden('Non hai i permessi per questa Venue');
      }
    }

    // Determine Location String (PostGIS)
    let locationStr = 'POINT(8.5417 47.3769)'; // Default to Zurich
    let finalAddress = address || 'Address not specified';

    if (venue_id) {
      // If a venue is selected, ideally we use its location, but we just let the DB handle it if we want
      // For now, if we have location_lat and location_lng from frontend, we use it
      if (location_lng !== undefined && location_lat !== undefined) {
         locationStr = `POINT(${location_lng} ${location_lat})`;
      }
    } else if (location_lng !== undefined && location_lat !== undefined) {
      locationStr = `POINT(${location_lng} ${location_lat})`;
    }

    // Genera slug
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const eventSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // Inserimento evento
    const { data: event, error } = await ctx.supabase
      .from('events')
      .insert([{
        organizer_id: ctx.user.id,
        venue_id: venue_id || null,
        title,
        description,
        slug: eventSlug,
        location: locationStr,
        address: finalAddress,
        category,
        starts_at: starts_at,
        ends_at: ends_at || null,
        cover_url: cover_url || null,
        ticket_price: ticket_price,
        ticket_limit: max_attendees,
        status: 'published'
      }])
      .select()
      .single();

    if (error) {
      console.error('[CreateEvent API] Insert Error:', error);
      throw Errors.internal('Errore durante il salvataggio dell\'evento');
    }

    return ok({ event }, 201);
  },
  {
    auth: true,
    bodySchema: eventCreateSchema,
    rateLimit: [10, '1m'] // Max 10 event creations per minute
  }
);
