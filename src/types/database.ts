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
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          id: string
          user_id: string
          venue_id: string
          created_at: string
          status: string | null
          caption: string | null
        }
        Insert: {
          id?: string
          user_id: string
          venue_id: string
          created_at?: string
          status?: string | null
          caption?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          venue_id?: string
          created_at?: string
          status?: string | null
          caption?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
      circle_members: {
        Row: {
          id: string
          circle_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          circle_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          circle_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "social_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "circle_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      creator_stats: {
        Row: {
          creator_id: string
          total_followers: number
          total_profile_views: number
          updated_at: string
        }
        Insert: {
          creator_id: string
          total_followers?: number
          total_profile_views?: number
          updated_at?: string
        }
        Update: {
          creator_id?: string
          total_followers?: number
          total_profile_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_stats_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      circles: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "circles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          like_count: number
          parent_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          like_count?: number
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          }
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      direct_messages: {
        Row: {
          conversation_id: string
          created_at: string
          encrypted_content: string
          id: string
          media_type: string | null
          media_url: string | null
          nonce: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          encrypted_content: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          nonce: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          encrypted_content?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          nonce?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      event_artists: {
        Row: {
          artist_id: string
          created_at: string
          event_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          event_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_artists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          actual_crowd: number
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          expected_crowd: number | null
          id: string
          is_promoted: boolean
          location: Json | null
          music_genres: string[] | null
          organizer_id: string | null
          rsvp_count: number
          slug: string
          starts_at: string
          status: string
          tags: string[] | null
          ticket_price: number | null
          ticket_url: string | null
          title: string
          updated_at: string
          venue_id: string | null
          view_count: number
          weather_cache: Json | null
        }
        Insert: {
          actual_crowd?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          expected_crowd?: number | null
          id?: string
          is_promoted?: boolean
          location?: Json | null
          music_genres?: string[] | null
          organizer_id?: string | null
          rsvp_count?: number
          slug: string
          starts_at: string
          status?: string
          tags?: string[] | null
          ticket_price?: number | null
          ticket_url?: string | null
          title: string
          updated_at?: string
          venue_id?: string | null
          view_count?: number
          weather_cache?: Json | null
        }
        Update: {
          actual_crowd?: number
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          expected_crowd?: number | null
          id?: string
          is_promoted?: boolean
          location?: Json | null
          music_genres?: string[] | null
          organizer_id?: string | null
          rsvp_count?: number
          slug?: string
          starts_at?: string
          status?: string
          tags?: string[] | null
          ticket_price?: number | null
          ticket_url?: string | null
          title?: string
          updated_at?: string
          venue_id?: string | null
          view_count?: number
          weather_cache?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      followers: {
        Row: {
          created_at: string
          entity_type: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          entity_type: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          entity_type?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      hashtags: {
        Row: {
          id: string
          tag: string
          count: number
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tag: string
          count?: number
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          tag?: string
          count?: number
          last_used_at?: string
          created_at?: string
        }
        Relationships: []
      }
      highlight_stories: {
        Row: {
          id: string
          highlight_id: string
          story_id: string
          created_at: string
        }
        Insert: {
          id?: string
          highlight_id: string
          story_id: string
          created_at?: string
        }
        Update: {
          id?: string
          highlight_id?: string
          story_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_stories_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "story_highlights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          }
        ]
      }
      likes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_settings: {
        Row: {
          user_id: string
          push_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          push_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          push_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      privacy_settings: {
        Row: {
          user_id: string
          show_activity_status: boolean
          anon_mode: boolean
          account_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          show_activity_status?: boolean
          anon_mode?: boolean
          account_type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          show_activity_status?: boolean
          anon_mode?: boolean
          account_type?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chats: {
        Row: {
          id: string
          created_at: string
          last_message: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          last_message?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          last_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          chat_id: string | null
          sender_id: string
          content: string
          type: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          chat_id?: string | null
          sender_id: string
          content: string
          type?: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string | null
          sender_id?: string
          content?: string
          type?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          ended_at: string | null
          event_id: string | null
          host_id: string
          id: string
          playback_url: string | null
          started_at: string | null
          status: string
          title: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          event_id?: string | null
          host_id: string
          id?: string
          playback_url?: string | null
          started_at?: string | null
          status?: string
          title: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          event_id?: string | null
          host_id?: string
          id?: string
          playback_url?: string | null
          started_at?: string | null
          status?: string
          title?: string
          viewer_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_streams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      media: {
        Row: {
          allowed_circle_id: string | null
          author_id: string
          caption: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          like_count: number
          location: Json | null
          location_name: string | null
          media_type: string | null
          media_url: string | null
          thumbnail_url: string | null
          type: string
          url: string
          user_id: string | null
          view_count: number
          visibility: string
        }
        Insert: {
          allowed_circle_id?: string | null
          author_id: string
          caption?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          like_count?: number
          location?: Json | null
          location_name?: string | null
          media_type?: string | null
          media_url?: string | null
          thumbnail_url?: string | null
          type: string
          url: string
          user_id?: string | null
          view_count?: number
          visibility?: string
        }
        Update: {
          allowed_circle_id?: string | null
          author_id?: string
          caption?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          like_count?: number
          location?: Json | null
          location_name?: string | null
          media_type?: string | null
          media_url?: string | null
          thumbnail_url?: string | null
          type?: string
          url?: string
          user_id?: string | null
          view_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_allowed_circle_id_fkey"
            columns: ["allowed_circle_id"]
            isOneToOne: false
            referencedRelation: "social_circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          destination_amount: number | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          platform_fee_amount: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          destination_amount?: number | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          platform_fee_amount?: number | null
          status: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          destination_amount?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          platform_fee_amount?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      post_hashtags: {
        Row: {
          hashtag_id: string
          post_id: string
          post_type: string
        }
        Insert: {
          hashtag_id: string
          post_id: string
          post_type: string
        }
        Update: {
          hashtag_id?: string
          post_id?: string
          post_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          }
        ]
      }
      safe_home_sessions: {
        Row: {
          id: string
          user_id: string
          status: string
          started_at: string
          ended_at: string | null
          last_location: Json | null
          eta_minutes: number | null
          auto_alert_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status: string
          started_at?: string
          ended_at?: string | null
          last_location?: Json | null
          eta_minutes?: number | null
          auto_alert_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          started_at?: string
          ended_at?: string | null
          last_location?: Json | null
          eta_minutes?: number | null
          auto_alert_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safe_home_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      saved_posts: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      social_circles: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
          is_favorite: boolean
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
          is_favorite?: boolean
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
          is_favorite?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "social_circles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stories: {
        Row: {
          author_id: string
          bg_color: string | null
          created_at: string
          duration: number | null
          entity_type: string | null
          expires_at: string
          id: string
          location: Json | null
          media_url: string | null
          text_color: string | null
          text_content: string | null
          type: string
          view_count: number
        }
        Insert: {
          author_id: string
          bg_color?: string | null
          created_at?: string
          duration?: number | null
          entity_type?: string | null
          expires_at: string
          id?: string
          location?: Json | null
          media_url?: string | null
          text_color?: string | null
          text_content?: string | null
          type: string
          view_count?: number
        }
        Update: {
          author_id?: string
          bg_color?: string | null
          created_at?: string
          duration?: number | null
          entity_type?: string | null
          expires_at?: string
          id?: string
          location?: Json | null
          media_url?: string | null
          text_color?: string | null
          text_content?: string | null
          type?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      story_highlights: {
        Row: {
          id: string
          user_id: string
          title: string
          cover_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          cover_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          cover_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_highlights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      story_views: {
        Row: {
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          entity_id: string
          entity_type: string
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end: string
          entity_id: string
          entity_type: string
          id?: string
          plan: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string
          entity_id?: string
          entity_type?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      ticket_instances: {
        Row: {
          created_at: string
          event_id: string
          id: string
          qr_code_hash: string
          signature: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          qr_code_hash: string
          signature: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          qr_code_hash?: string
          signature?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_instances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_instances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          created_at: string
          currency: string
          event_id: string
          id: string
          purchased_at: string
          qr_code: string
          quantity: number
          status: string
          stripe_payment_intent_id: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          event_id: string
          id?: string
          purchased_at?: string
          qr_code: string
          quantity?: number
          status: string
          stripe_payment_intent_id?: string | null
          total_price: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          purchased_at?: string
          qr_code?: string
          quantity?: number
          status?: string
          stripe_payment_intent_id?: string | null
          total_price?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      trending_hashtags: {
        Row: {
          hashtag_id: string
          score: number
          period: string
          updated_at: string
        }
        Insert: {
          hashtag_id: string
          score: number
          period: string
          updated_at?: string
        }
        Update: {
          hashtag_id?: string
          score?: number
          period?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trending_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          }
        ]
      }
      trusted_contacts: {
        Row: {
          id: string
          user_id: string
          contact_user_id: string
          created_at: string
          is_emergency_contact: boolean
        }
        Insert: {
          id?: string
          user_id: string
          contact_user_id: string
          created_at?: string
          is_emergency_contact?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          contact_user_id?: string
          created_at?: string
          is_emergency_contact?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trusted_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_contacts_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_badges: {
        Row: {
          user_id: string
          badge_type: string
          earned_at: string
        }
        Insert: {
          user_id: string
          badge_type: string
          earned_at?: string
        }
        Update: {
          user_id?: string
          badge_type?: string
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_blocks: {
        Row: {
          id: string
          user_id: string
          blocked_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          blocked_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          blocked_user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_settings: {
        Row: {
          user_id: string
          theme_preset: string
          custom_theme_hsl: string | null
          is_private: boolean
          show_activity: boolean
          push_notifications: boolean
          email_notifications: boolean
          usage_limit_minutes: number | null
          language: string
          updated_at: string
        }
        Insert: {
          user_id: string
          theme_preset?: string
          custom_theme_hsl?: string | null
          is_private?: boolean
          show_activity?: boolean
          push_notifications?: boolean
          email_notifications?: boolean
          usage_limit_minutes?: number | null
          language?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          theme_preset?: string
          custom_theme_hsl?: string | null
          is_private?: boolean
          show_activity?: boolean
          push_notifications?: boolean
          email_notifications?: boolean
          usage_limit_minutes?: number | null
          language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          minutes_used: number
          daily_limit_minutes: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          minutes_used?: number
          daily_limit_minutes?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          minutes_used?: number
          daily_limit_minutes?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          account_type: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          is_verified: boolean
          language: string
          last_location: Json | null
          last_seen_at: string | null
          map_visibility: string
          onboarding_completed: boolean
          phone: string | null
          role: string
          two_fa_enabled: boolean
          updated_at: string
          username: string
          vibe_points: number
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          is_verified?: boolean
          language?: string
          last_location?: Json | null
          last_seen_at?: string | null
          map_visibility?: string
          onboarding_completed?: boolean
          phone?: string | null
          role?: string
          two_fa_enabled?: boolean
          updated_at?: string
          username: string
          vibe_points?: number
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          language?: string
          last_location?: Json | null
          last_seen_at?: string | null
          map_visibility?: string
          onboarding_completed?: boolean
          phone?: string | null
          role?: string
          two_fa_enabled?: boolean
          updated_at?: string
          username?: string
          vibe_points?: number
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          amenities: Json | null
          avg_rating: number
          capacity: number | null
          city: string | null
          contact_info: Json | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          follower_count: number
          id: string
          is_verified: boolean
          location: Json | null
          logo_url: string | null
          music_genres: Json | null
          name: string
          opening_hours: Json | null
          owner_id: string | null
          slug: string
          subscription_id: string | null
          type: string | null
          updated_at: string
          vibe_score: number
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          avg_rating?: number
          capacity?: number | null
          city?: string | null
          contact_info?: Json | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number
          id?: string
          is_verified?: boolean
          location?: Json | null
          logo_url?: string | null
          music_genres?: Json | null
          name: string
          opening_hours?: Json | null
          owner_id?: string | null
          slug: string
          subscription_id?: string | null
          type?: string | null
          updated_at?: string
          vibe_score?: number
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          avg_rating?: number
          capacity?: number | null
          city?: string | null
          contact_info?: Json | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          follower_count?: number
          id?: string
          location?: Json | null
          logo_url?: string | null
          music_genres?: Json | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string | null
          slug?: string
          subscription_id?: string | null
          type?: string | null
          updated_at?: string
          vibe_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
