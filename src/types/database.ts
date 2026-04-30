export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          language: string
          role: string
          is_verified: boolean
          is_active: boolean
          two_fa_enabled: boolean
          map_visibility: string
          last_location: any | null
          last_seen_at: string | null
          created_at: string
          updated_at: string
          account_type: string
          vibe_points: number
          onboarding_completed: boolean
        }
        Insert: {
          id?: string
          email?: string
          phone?: string | null
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          language?: string
          role?: string
          is_verified?: boolean
          is_active?: boolean
          two_fa_enabled?: boolean
          map_visibility?: string
          last_location?: any | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
          account_type?: string
          vibe_points?: number
          onboarding_completed?: boolean
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          language?: string
          role?: string
          is_verified?: boolean
          is_active?: boolean
          two_fa_enabled?: boolean
          map_visibility?: string
          last_location?: any | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
          account_type?: string
          vibe_points?: number
          onboarding_completed?: boolean
        }
      }
      stories: {
        Row: {
          id: string
          author_id: string
          media_url: string | null
          type: 'photo' | 'video' | 'text'
          text_content: string | null
          text_color: string | null
          bg_color: string | null
          duration: number | null
          location: any | null
          entity_type: string | null
          view_count: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          media_url?: string | null
          type: 'photo' | 'video' | 'text'
          text_content?: string | null
          text_color?: string | null
          bg_color?: string | null
          duration?: number | null
          location?: any | null
          entity_type?: string | null
          view_count?: number
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          media_url?: string | null
          type?: 'photo' | 'video' | 'text'
          text_content?: string | null
          text_color?: string | null
          bg_color?: string | null
          duration?: number | null
          location?: any | null
          entity_type?: string | null
          view_count?: number
          expires_at?: string
          created_at?: string
        }
      }
      media: {
        Row: {
          id: string
          author_id: string
          entity_type: string
          entity_id: string
          type: string
          url: string
          thumbnail_url: string | null
          caption: string | null
          view_count: number
          like_count: number
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          entity_type: string
          entity_id: string
          type: string
          url: string
          thumbnail_url?: string | null
          caption?: string | null
          view_count?: number
          like_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          entity_type?: string
          entity_id?: string
          type?: string
          url?: string
          thumbnail_url?: string | null
          caption?: string | null
          view_count?: number
          like_count?: number
          created_at?: string
        }
      }
      live_streams: {
        Row: {
          id: string
          host_id: string
          event_id: string | null
          title: string
          status: string
          viewer_count: number
          playback_url: string | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          host_id: string
          event_id?: string | null
          title: string
          status?: string
          viewer_count?: number
          playback_url?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          event_id?: string | null
          title?: string
          status?: string
          viewer_count?: number
          playback_url?: string | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      point_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          reason: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          reason: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          reason?: string
          metadata?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_vibe_points: {
        Args: {
          p_user_id: string
          p_amount: number
          p_reason: string
          p_metadata?: Json
        }
        Returns: number
      }
      get_or_create_conversation: {
        Args: {
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
