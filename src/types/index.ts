export * from './database';

export type VibeStyle = 'vibe-purple' | 'vibe-cyan' | 'vibe-pink' | 'vibe-dark' | 'vibe-glass';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
}

export interface Interest {
  id: string;
  name: string;
  emoji: string;
}
