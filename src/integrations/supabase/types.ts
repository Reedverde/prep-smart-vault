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
  public: {
    Tables: {
      alerts: {
        Row: {
          area_desc: string | null
          created_at: string
          delivered_channels: string[]
          description: string | null
          dismissed_at: string | null
          event_type: string | null
          expires_at: string | null
          external_id: string
          headline: string
          id: string
          issued_at: string | null
          severity: string | null
          source: string
          tier: number
          user_id: string
        }
        Insert: {
          area_desc?: string | null
          created_at?: string
          delivered_channels?: string[]
          description?: string | null
          dismissed_at?: string | null
          event_type?: string | null
          expires_at?: string | null
          external_id: string
          headline: string
          id?: string
          issued_at?: string | null
          severity?: string | null
          source: string
          tier: number
          user_id: string
        }
        Update: {
          area_desc?: string | null
          created_at?: string
          delivered_channels?: string[]
          description?: string | null
          dismissed_at?: string | null
          event_type?: string | null
          expires_at?: string | null
          external_id?: string
          headline?: string
          id?: string
          issued_at?: string | null
          severity?: string | null
          source?: string
          tier?: number
          user_id?: string
        }
        Relationships: []
      }
      api_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
          updated_at: string
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
          updated_at?: string
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          expires_at: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      library_docs: {
        Row: {
          categories: string[]
          created_at: string
          description: string | null
          doc_type: string | null
          drive_file_id: string | null
          id: string
          mime_type: string | null
          original_filename: string | null
          page_count: number | null
          storage_path: string | null
          tags: string[]
          text_content: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          description?: string | null
          doc_type?: string | null
          drive_file_id?: string | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          page_count?: number | null
          storage_path?: string | null
          tags?: string[]
          text_content?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          description?: string | null
          doc_type?: string | null
          drive_file_id?: string | null
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          page_count?: number | null
          storage_path?: string | null
          tags?: string[]
          text_content?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          captured_at: string
          created_at: string
          dashboard_data: Json
          id: string
          kind: string
          notes: string | null
          screenshot_url: string | null
          summary: Json
          title: string | null
          user_id: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          dashboard_data?: Json
          id?: string
          kind?: string
          notes?: string | null
          screenshot_url?: string | null
          summary?: Json
          title?: string | null
          user_id: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          dashboard_data?: Json
          id?: string
          kind?: string
          notes?: string | null
          screenshot_url?: string | null
          summary?: Json
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          alert_tier_1: boolean
          alert_tier_2: boolean
          alert_tier_3: boolean
          channel_banner: boolean
          channel_email: boolean
          channel_ntfy: boolean
          channel_web_push: boolean
          created_at: string
          latitude: number
          location_name: string
          longitude: number
          ntfy_topic: string | null
          refresh_interval_min: number
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_tier_1?: boolean
          alert_tier_2?: boolean
          alert_tier_3?: boolean
          channel_banner?: boolean
          channel_email?: boolean
          channel_ntfy?: boolean
          channel_web_push?: boolean
          created_at?: string
          latitude?: number
          location_name?: string
          longitude?: number
          ntfy_topic?: string | null
          refresh_interval_min?: number
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_tier_1?: boolean
          alert_tier_2?: boolean
          alert_tier_3?: boolean
          channel_banner?: boolean
          channel_email?: boolean
          channel_ntfy?: boolean
          channel_web_push?: boolean
          created_at?: string
          latitude?: number
          location_name?: string
          longitude?: number
          ntfy_topic?: string | null
          refresh_interval_min?: number
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
