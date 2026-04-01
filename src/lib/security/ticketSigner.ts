import crypto from 'crypto';

/**
 * VIBE TICKET SECURITY (System 14)
 * Genera una firma crittografica HMAC per validare i QR ticket.
 * Impedisce la contraffazione dei biglietti manipolando l'ID.
 */
const TICKET_SECRET = process.env.TICKET_SIGNER_SECRET || 'vibe_secret_alpha_2026';

export function signTicket(ticketId: string, userId: string, eventId: string): string {
  const payload = `${ticketId}:${userId}:${eventId}`;
  return crypto
    .createHmac('sha256', TICKET_SECRET)
    .update(payload)
    .digest('hex');
}

export function verifyTicket(ticketId: string, userId: string, eventId: string, signature: string): boolean {
  const expected = signTicket(ticketId, userId, eventId);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Formats a payload for QR embedding
 */
export function generateQRPayload(ticketId: string, signature: string): string {
  // Versione compatta per QR veloci: v:[version]:[id]:[prefix_sig]
  return `v1:${ticketId}:${signature.slice(0, 16)}`;
}
