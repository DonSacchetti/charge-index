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
      ai_insights: {
        Row: {
          energy_type: string | null
          generated_at: string
          input_tokens: number | null
          insights: Json | null
          model: string | null
          output_tokens: number | null
          recommendations: Json | null
          session_id: string
        }
        Insert: {
          energy_type?: string | null
          generated_at?: string
          input_tokens?: number | null
          insights?: Json | null
          model?: string | null
          output_tokens?: number | null
          recommendations?: Json | null
          session_id: string
        }
        Update: {
          energy_type?: string | null
          generated_at?: string
          input_tokens?: number | null
          insights?: Json | null
          model?: string | null
          output_tokens?: number | null
          recommendations?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "ai_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          author_id: string | null
          body: string
          client_id: string
          created_at: string
          id: string
          session_id: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          client_id: string
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "coach_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entries: {
        Row: {
          created_at: string
          day_number: number
          energy_pct: number
          id: string
          session_id: string
          slot_hour: string
        }
        Insert: {
          created_at?: string
          day_number: number
          energy_pct: number
          id?: string
          session_id: string
          slot_hour: string
        }
        Update: {
          created_at?: string
          day_number?: number
          energy_pct?: number
          id?: string
          session_id?: string
          slot_hour?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "daily_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          day_number: number
          feel_note: string | null
          for_jen_note: string | null
          id: string
          session_id: string
          unexpected_note: string | null
          updated_at: string
        }
        Insert: {
          day_number: number
          feel_note?: string | null
          for_jen_note?: string | null
          id?: string
          session_id: string
          unexpected_note?: string | null
          updated_at?: string
        }
        Update: {
          day_number?: number
          feel_note?: string | null
          for_jen_note?: string | null
          id?: string
          session_id?: string
          unexpected_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "daily_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_notes: {
        Row: {
          body: string
          id: string
          session_id: string
          slot_hour: string
          updated_at: string
        }
        Insert: {
          body: string
          id?: string
          session_id: string
          slot_hour: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          session_id?: string
          slot_hour?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "plan_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number | null
          client_id: string
          id: string
          product: Database["public"]["Enums"]["purchase_product"]
          purchased_at: string
          session_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          client_id: string
          id?: string
          product: Database["public"]["Enums"]["purchase_product"]
          purchased_at?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          client_id?: string
          id?: string
          product?: Database["public"]["Enums"]["purchase_product"]
          purchased_at?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "purchases_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          day_number: number
          id: string
          reminder_key: string
          sent_at: string
          session_id: string
        }
        Insert: {
          day_number: number
          id?: string
          reminder_key: string
          sent_at?: string
          session_id: string
        }
        Update: {
          day_number?: number
          id?: string
          reminder_key?: string
          sent_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "reminder_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_analysis: {
        Row: {
          computed_at: string
          ideal_day: Json | null
          session_id: string
          windows: Json | null
        }
        Insert: {
          computed_at?: string
          ideal_day?: Json | null
          session_id: string
          windows?: Json | null
        }
        Update: {
          computed_at?: string
          ideal_day?: Json | null
          session_id?: string
          windows?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_analysis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "session_entry_stats"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_analysis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "tracking_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_grants: {
        Row: {
          client_id: string
          created_at: string
          granted_by: string
          id: string
          note: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          granted_by: string
          id?: string
          note?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_grants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_sessions: {
        Row: {
          client_id: string
          created_at: string
          day_count: number
          id: string
          label: string | null
          reminder_pref: Database["public"]["Enums"]["reminder_pref"]
          sleep_time: string
          start_date: string
          status: Database["public"]["Enums"]["session_status"]
          timezone: string | null
          wake_time: string
        }
        Insert: {
          client_id: string
          created_at?: string
          day_count: number
          id?: string
          label?: string | null
          reminder_pref?: Database["public"]["Enums"]["reminder_pref"]
          sleep_time: string
          start_date?: string
          status?: Database["public"]["Enums"]["session_status"]
          timezone?: string | null
          wake_time: string
        }
        Update: {
          client_id?: string
          created_at?: string
          day_count?: number
          id?: string
          label?: string | null
          reminder_pref?: Database["public"]["Enums"]["reminder_pref"]
          sleep_time?: string
          start_date?: string
          status?: Database["public"]["Enums"]["session_status"]
          timezone?: string | null
          wake_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      session_entry_stats: {
        Row: {
          client_id: string | null
          hours_logged: number | null
          session_id: string | null
          top_hours: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_start_session: { Args: never; Returns: boolean }
      has_peak_plan: { Args: { p_session: string }; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      session_day_unlocked: {
        Args: { p_day: number; p_session: string }
        Returns: boolean
      }
    }
    Enums: {
      purchase_product: "basic_peak_plan" | "peak_plan_session" | "coaching"
      purchase_status: "pending" | "completed" | "refunded"
      reminder_pref: "none" | "hourly" | "three_times_daily" | "once_daily"
      session_status: "in_progress" | "completed"
      user_role: "client" | "coach" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      purchase_product: ["basic_peak_plan", "peak_plan_session", "coaching"],
      purchase_status: ["pending", "completed", "refunded"],
      reminder_pref: ["none", "hourly", "three_times_daily", "once_daily"],
      session_status: ["in_progress", "completed"],
      user_role: ["client", "coach", "admin"],
    },
  },
} as const
