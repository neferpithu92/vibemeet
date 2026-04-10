export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          language: string
          role: string
          is_verified: boolean
          last_location: any | null // Geography point
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          language?: string
          role?: string
          is_verified?: boolean
          last_location?: any | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          language?: string
          role?: string
          is_verified?: boolean
          last_location?: any | null
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          owner_id: string | null
          name: string
          slug: string
          description: string | null
          type: string | null
          address: string | null
          city: string | null
          country: string
          location: any // Geography point
          cover_url: string | null
          logo_url: string | null
          opening_hours: Json | null
          music_genres: string[] | null
          amenities: Json | null
          contact_info: Json | null
          subscription_id: string | null
          is_verified: boolean
          avg_rating: number
          follower_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id?: string | null
          name: string
          slug: string
          description?: string | null
          type?: string | null
          address?: string | null
          city?: string | null
          country?: string
          location: any
          cover_url?: string | null
          logo_url?: string | null
          opening_hours?: Json | null
          music_genres?: string[] | null
          amenities?: Json | null
          contact_info?: Json | null
          subscription_id?: string | null
          is_verified?: boolean
          avg_rating?: number
          follower_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          type?: string | null
          address?: string | null
          city?: string | null
          country?: string
          location?: any
          cover_url?: string | null
          logo_url?: string | null
          opening_hours?: Json | null
          music_genres?: string[] | null
          amenities?: Json | null
          contact_info?: Json | null
          subscription_id?: string | null
          is_verified?: boolean
          avg_rating?: number
          follower_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          venue_id: string | null
          organizer_id: string | null
          title: string
          description: string | null
          slug: string
          location: any
          address: string | null
          starts_at: string
          ends_at: string | null
          music_genres: string[] | null
          artists: string[] | null
          ticket_price: number | null
          ticket_url: string | null
          status: string
          is_promoted: boolean
          vibe_score: number
          rsvp_count: number
          cover_url: string | null
          media_urls: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id?: string | null
          organizer_id?: string | null
          title: string
          description?: string | null
          slug: string
          location: any
          address?: string | null
          starts_at: string
          ends_at?: string | null
          music_genres?: string[] | null
          artists?: string[] | null
          ticket_price?: number | null
          ticket_url?: string | null
          status?: string
          is_promoted?: boolean
          vibe_score?: number
          rsvp_count?: number
          cover_url?: string | null
          media_urls?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string | null
          organizer_id?: string | null
          title?: string
          description?: string | null
          slug?: string
          location?: any
          address?: string | null
          starts_at?: string
          ends_at?: string | null
          music_genres?: string[] | null
          artists?: string[] | null
          ticket_price?: number | null
          ticket_url?: string | null
          status?: string
          is_promoted?: boolean
          vibe_score?: number
          rsvp_count?: number
          cover_url?: string | null
          media_urls?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      media: {
        Row: {
          id: string
          user_id: string | null
          entity_type: string
          entity_id: string
          media_type: string
          media_url: string
          thumbnail_url: string | null
          caption: string | null
          location: any | null
          like_count: number
          comment_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          entity_type: string
          entity_id: string
          media_type: string
          media_url: string
          thumbnail_url?: string | null
          caption?: string | null
          location?: any | null
          like_count?: number
          comment_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          entity_type?: string
          entity_id?: string
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          caption?: string | null
          location?: any | null
          like_count?: number
          comment_count?: number
          created_at?: string
        }
      }
      stories: {
        Row: {
          id: string
          author_id: string
          entity_type: string
          media_url: string
          thumbnail_url: string | null
          location: any | null
          caption: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          entity_type?: string
          media_url: string
          thumbnail_url?: string | null
          location?: any | null
          caption?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          entity_type?: string
          media_url?: string
          thumbnail_url?: string | null
          location?: any | null
          caption?: string | null
          expires_at?: string
          created_at?: string
        }
      }
      followers: {
        Row: {
          follower_id: string
          following_id: string
          entity_type: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          entity_type?: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          entity_type?: string
          created_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          entity_id: string
          entity_type: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          current_period_end: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_id: string
          entity_type: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_id?: string
          entity_type?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          current_period_end?: string | null
          created_at?: string
        }
      }
      artists: {
        Row: {
          id: string
          name: string
          bio: string | null
          avatar_url: string | null
          cover_url: string | null
          genres: string[] | null
          follower_count: number
          is_verified: boolean
          instagram_url: string | null
          spotify_url: string | null
          soundcloud_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          bio?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          genres?: string[] | null
          follower_count?: number
          is_verified?: boolean
          instagram_url?: string | null
          spotify_url?: string | null
          soundcloud_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          bio?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          genres?: string[] | null
          follower_count?: number
          is_verified?: boolean
          instagram_url?: string | null
          spotify_url?: string | null
          soundcloud_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_artists: {
        Row: {
          event_id: string
          artist_id: string
          created_at: string
        }
        Insert: {
          event_id: string
          artist_id: string
          created_at?: string
        }
        Update: {
          event_id?: string
          artist_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_rsvp: {
        Args: { row_id: string }
        Returns: void
      }
      decrement_rsvp: {
        Args: { row_id: string }
        Returns: void
      }
      get_venue_crowd: {
        Args: { v_id: string }
        Returns: number
      }
      get_nearby_users: {
        Args: { 
          lon: number
          lat: number
          radius_meters?: number
          active_within_minutes?: number
        }
        Returns: {
          id: string
          username: string
          avatar_url: string
          longitude: number
          latitude: number
          last_seen_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
