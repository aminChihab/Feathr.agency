export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          description: string | null
          id: string
          last_activity_at: string | null
          last_activity_description: string | null
          metadata: Json | null
          name: string
          profile_id: string
          slug: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          last_activity_at?: string | null
          last_activity_description?: string | null
          metadata?: Json | null
          name: string
          profile_id: string
          slug: string
          status?: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          last_activity_at?: string | null
          last_activity_description?: string | null
          metadata?: Json | null
          name?: string
          profile_id?: string
          slug?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics: {
        Row: {
          date: string
          engagement: number
          followers: number
          id: string
          impressions: number
          metadata: Json | null
          platform_account_id: string
          profile_id: string
          revenue_cents: number
        }
        Insert: {
          date: string
          engagement?: number
          followers?: number
          id?: string
          impressions?: number
          metadata?: Json | null
          platform_account_id: string
          profile_id: string
          revenue_cents?: number
        }
        Update: {
          date?: string
          engagement?: number
          followers?: number
          id?: string
          impressions?: number
          metadata?: Json | null
          platform_account_id?: string
          profile_id?: string
          revenue_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "analytics_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          created_at: string
          date: string
          duration: string | null
          id: string
          notes: string | null
          profile_id: string
          revenue_cents: number
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          duration?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          revenue_cents?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          duration?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          revenue_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          is_vip: boolean
          last_booking_at: string | null
          name: string
          platforms: Json | null
          preferences: string | null
          profile_id: string
          tags: string[] | null
          total_bookings: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_vip?: boolean
          last_booking_at?: string | null
          name: string
          platforms?: Json | null
          preferences?: string | null
          profile_id: string
          tags?: string[] | null
          total_bookings?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_vip?: boolean
          last_booking_at?: string | null
          name?: string
          platforms?: Json | null
          preferences?: string | null
          profile_id?: string
          tags?: string[] | null
          total_bookings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_calendar: {
        Row: {
          ai_generated: boolean
          caption: string | null
          created_at: string
          id: string
          media_ids: string[] | null
          metadata: Json | null
          platform_account_id: string
          post_url: string | null
          posted_at: string | null
          profile_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          caption?: string | null
          created_at?: string
          id?: string
          media_ids?: string[] | null
          metadata?: Json | null
          platform_account_id: string
          post_url?: string | null
          posted_at?: string | null
          profile_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          caption?: string | null
          created_at?: string
          id?: string
          media_ids?: string[] | null
          metadata?: Json | null
          platform_account_id?: string
          post_url?: string | null
          posted_at?: string | null
          profile_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_calendar_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_library: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          metadata: Json | null
          mime_type: string
          profile_id: string
          storage_path: string
          tags: string[] | null
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["file_type"]
          id?: string
          metadata?: Json | null
          mime_type: string
          profile_id: string
          storage_path: string
          tags?: string[] | null
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          metadata?: Json | null
          mime_type?: string
          profile_id?: string
          storage_path?: string
          tags?: string[] | null
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_library_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_summary: string | null
          client_id: string | null
          contact_handle: string | null
          contact_name: string | null
          created_at: string
          external_thread_id: string | null
          id: string
          last_message_at: string | null
          platform_account_id: string
          priority: Database["public"]["Enums"]["conversation_priority"]
          profile_id: string
          status: Database["public"]["Enums"]["conversation_status"]
          type: Database["public"]["Enums"]["conversation_type"]
        }
        Insert: {
          ai_summary?: string | null
          client_id?: string | null
          contact_handle?: string | null
          contact_name?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          platform_account_id: string
          priority?: Database["public"]["Enums"]["conversation_priority"]
          profile_id: string
          status?: Database["public"]["Enums"]["conversation_status"]
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Update: {
          ai_summary?: string | null
          client_id?: string | null
          contact_handle?: string | null
          contact_name?: string | null
          created_at?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string | null
          platform_account_id?: string
          priority?: Database["public"]["Enums"]["conversation_priority"]
          profile_id?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          type?: Database["public"]["Enums"]["conversation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          client_id: string | null
          conversation_id: string
          created_at: string
          id: string
          notes: string | null
          profile_id: string
          requested_date: string | null
          requested_duration: string | null
          score: number | null
          status: Database["public"]["Enums"]["lead_status"]
        }
        Insert: {
          client_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          notes?: string | null
          profile_id: string
          requested_date?: string | null
          requested_duration?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Update: {
          client_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          profile_id?: string
          requested_date?: string | null
          requested_duration?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["lead_status"]
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          listing_url: string | null
          performance: Json | null
          platform_account_id: string
          profile_id: string
          renewal_status: Database["public"]["Enums"]["renewal_status"]
          status: Database["public"]["Enums"]["listing_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_url?: string | null
          performance?: Json | null
          platform_account_id: string
          profile_id: string
          renewal_status?: Database["public"]["Enums"]["renewal_status"]
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_url?: string | null
          performance?: Json | null
          platform_account_id?: string
          profile_id?: string
          renewal_status?: Database["public"]["Enums"]["renewal_status"]
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_approved: boolean | null
          ai_generated: boolean
          body: string
          conversation_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id: string
          metadata: Json | null
          sent_at: string
        }
        Insert: {
          ai_approved?: boolean | null
          ai_generated?: boolean
          body: string
          conversation_id: string
          direction: Database["public"]["Enums"]["message_direction"]
          id?: string
          metadata?: Json | null
          sent_at?: string
        }
        Update: {
          ai_approved?: boolean | null
          ai_generated?: boolean
          body?: string
          conversation_id?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          id?: string
          metadata?: Json | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_accounts: {
        Row: {
          connected_at: string
          credentials_encrypted: string | null
          id: string
          metadata: Json | null
          platform_id: string
          profile_id: string
          schedule_json: Json | null
          status: Database["public"]["Enums"]["platform_account_status"]
          username: string | null
        }
        Insert: {
          connected_at?: string
          credentials_encrypted?: string | null
          id?: string
          metadata?: Json | null
          platform_id: string
          profile_id: string
          schedule_json?: Json | null
          status?: Database["public"]["Enums"]["platform_account_status"]
          username?: string | null
        }
        Update: {
          connected_at?: string
          credentials_encrypted?: string | null
          id?: string
          metadata?: Json | null
          platform_id?: string
          profile_id?: string
          schedule_json?: Json | null
          status?: Database["public"]["Enums"]["platform_account_status"]
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_accounts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          auth_type: Database["public"]["Enums"]["platform_auth_type"]
          capabilities: Json
          category: Database["public"]["Enums"]["platform_category"]
          color: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          auth_type: Database["public"]["Enums"]["platform_auth_type"]
          capabilities?: Json
          category: Database["public"]["Enums"]["platform_category"]
          color?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          auth_type?: Database["public"]["Enums"]["platform_auth_type"]
          capabilities?: Json
          category?: Database["public"]["Enums"]["platform_category"]
          color?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          calendar_item_id: string | null
          clicks: number
          engagement: number
          fetched_at: string | null
          id: string
          impressions: number
          platform_account_id: string
          post_url: string | null
          profile_id: string
        }
        Insert: {
          calendar_item_id?: string | null
          clicks?: number
          engagement?: number
          fetched_at?: string | null
          id?: string
          impressions?: number
          platform_account_id: string
          post_url?: string | null
          profile_id: string
        }
        Update: {
          calendar_item_id?: string | null
          clicks?: number
          engagement?: number
          fetched_at?: string | null
          id?: string
          impressions?: number
          platform_account_id?: string
          post_url?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_calendar_item_id_fkey"
            columns: ["calendar_item_id"]
            isOneToOne: false
            referencedRelation: "content_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_platform_account_id_fkey"
            columns: ["platform_account_id"]
            isOneToOne: false
            referencedRelation: "platform_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          goals: Json | null
          id: string
          onboarding_step: number
          professional_name: string | null
          settings: Json | null
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
          voice_description: string | null
          voice_sample: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          goals?: Json | null
          id: string
          onboarding_step?: number
          professional_name?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          voice_description?: string | null
          voice_sample?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          goals?: Json | null
          id?: string
          onboarding_step?: number
          professional_name?: string | null
          settings?: Json | null
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          voice_description?: string | null
          voice_sample?: string | null
        }
        Relationships: []
      }
      research_reports: {
        Row: {
          body: Json
          created_at: string
          id: string
          profile_id: string
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Insert: {
          body?: Json
          created_at?: string
          id?: string
          profile_id: string
          title: string
          type: Database["public"]["Enums"]["report_type"]
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          profile_id?: string
          title?: string
          type?: Database["public"]["Enums"]["report_type"]
        }
        Relationships: [
          {
            foreignKeyName: "research_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      touring_trips: {
        Row: {
          auto_announce: boolean
          auto_update_location: boolean
          country: string
          created_at: string
          destination_city: string
          end_date: string
          id: string
          pricing_adjustment: Json | null
          profile_id: string
          start_date: string
          status: Database["public"]["Enums"]["touring_status"]
        }
        Insert: {
          auto_announce?: boolean
          auto_update_location?: boolean
          country: string
          created_at?: string
          destination_city: string
          end_date: string
          id?: string
          pricing_adjustment?: Json | null
          profile_id: string
          start_date: string
          status?: Database["public"]["Enums"]["touring_status"]
        }
        Update: {
          auto_announce?: boolean
          auto_update_location?: boolean
          country?: string
          created_at?: string
          destination_city?: string
          end_date?: string
          id?: string
          pricing_adjustment?: Json | null
          profile_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["touring_status"]
        }
        Relationships: [
          {
            foreignKeyName: "touring_trips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      seed_agents_for_user: { Args: { user_id: string }; Returns: undefined }
    }
    Enums: {
      content_status: "draft" | "approved" | "scheduled" | "posted" | "failed"
      conversation_priority: "hot" | "warm" | "cold"
      conversation_status: "new" | "active" | "qualified" | "archived" | "spam"
      conversation_type:
        | "booking"
        | "fan"
        | "returning_client"
        | "spam"
        | "other"
      file_type: "photo" | "video" | "audio"
      lead_status: "new" | "contacted" | "confirmed" | "completed" | "cancelled"
      listing_status: "active" | "expiring" | "expired" | "renewing" | "paused"
      message_direction: "inbound" | "outbound"
      platform_account_status:
        | "connected"
        | "expired"
        | "disconnected"
        | "error"
      platform_auth_type: "oauth" | "credentials" | "api_key" | "manual"
      platform_category:
        | "social"
        | "content_income"
        | "directory"
        | "communication"
      profile_status: "onboarding" | "setup" | "active" | "paused"
      renewal_status: "none" | "pending" | "renewed" | "failed"
      report_type:
        | "trend"
        | "competitor"
        | "market"
        | "algorithm"
        | "performance"
      touring_status: "planned" | "active" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      content_status: ["draft", "approved", "scheduled", "posted", "failed"],
      conversation_priority: ["hot", "warm", "cold"],
      conversation_status: ["new", "active", "qualified", "archived", "spam"],
      conversation_type: [
        "booking",
        "fan",
        "returning_client",
        "spam",
        "other",
      ],
      file_type: ["photo", "video", "audio"],
      lead_status: ["new", "contacted", "confirmed", "completed", "cancelled"],
      listing_status: ["active", "expiring", "expired", "renewing", "paused"],
      message_direction: ["inbound", "outbound"],
      platform_account_status: [
        "connected",
        "expired",
        "disconnected",
        "error",
      ],
      platform_auth_type: ["oauth", "credentials", "api_key", "manual"],
      platform_category: [
        "social",
        "content_income",
        "directory",
        "communication",
      ],
      profile_status: ["onboarding", "setup", "active", "paused"],
      renewal_status: ["none", "pending", "renewed", "failed"],
      report_type: [
        "trend",
        "competitor",
        "market",
        "algorithm",
        "performance",
      ],
      touring_status: ["planned", "active", "completed", "cancelled"],
    },
  },
} as const
