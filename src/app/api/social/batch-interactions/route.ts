import { withApi, ok, Errors } from '@/lib/api';
import { batchInteractionsSchema } from '@/lib/api/schemas';

/**
 * POST /api/social/batch-interactions
 * Processa eventi di interazione (view, like, skip...) per il FYP.
 * Rate: 120 req/min — chiamata frequente dal client.
 */
export const POST = withApi(
  'social/batch-interactions',
  async (ctx, body) => {
    const { supabase, user } = ctx;
    const { interactions } = body;

    // Arricchisce ogni interazione con lo user_id server-side
    const enriched = interactions.map((item: any) => ({
      ...item,
      user_id: user.id,
    }));

    const { error } = await (supabase as any).rpc('process_batch_interactions', {
      p_interactions: enriched,
    });

    if (error) {
      // Non è critico — fallback silenzioso per non bloccare il client
      console.warn('[batch-interactions] RPC error:', error.message);
      return ok({ success: false, processed: 0, message: 'FYP tracking temporaneamente non disponibile' });
    }

    return ok({ success: true, processed: enriched.length });
  },
  {
    auth:       true,
    bodySchema: batchInteractionsSchema,
    rateLimit:  [120, '1m'],
  }
);
