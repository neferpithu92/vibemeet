import { z } from 'zod';

export const userProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  display_name: z.string().min(1).max(100),
  language: z.enum(['it', 'en', 'de', 'fr', 'rm']),
});

export const passwordSchema = z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/);

export const emailSchema = z.string().email();

export const messageSchema = z.object({
  content: z.string().min(1).max(5000),
  recipient_id: z.string().uuid(),
});

export const postSchema = z.object({
  content: z.string().max(300),
  media_url: z.string().url().optional(),
});
