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
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          is_verified?: boolean
          created_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          address: string | null
          latitude: number
          longitude: number
          vibe_score: number
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          address?: string | null
          latitude: number
          longitude: number
          vibe_score?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          address?: string | null
          latitude?: number
          longitude?: number
          vibe_score?: number
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          venue_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          category?: string | null
          created_at?: string
        }
      }
      followers: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
