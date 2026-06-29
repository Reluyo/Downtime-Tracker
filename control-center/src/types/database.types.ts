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
      app_config: {
        Row: {
          alert_repeat_minutes: number
          alert_threshold_minutes: number
          id: string
          line_id: string
          updated_at: string
        }
        Insert: {
          alert_repeat_minutes?: number
          alert_threshold_minutes?: number
          id?: string
          line_id: string
          updated_at?: string
        }
        Update: {
          alert_repeat_minutes?: number
          alert_threshold_minutes?: number
          id?: string
          line_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_config_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: true
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      downtime_events: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          equipment_id: string
          id: string
          line_id: string
          note: string | null
          reason_id: string | null
          started_at: string
          synced: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          equipment_id: string
          id?: string
          line_id: string
          note?: string | null
          reason_id?: string | null
          started_at: string
          synced?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          equipment_id?: string
          id?: string
          line_id?: string
          note?: string | null
          reason_id?: string | null
          started_at?: string
          synced?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "downtime_events_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_events_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "downtime_events_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "downtime_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      downtime_reasons: {
        Row: {
          created_at: string
          display_order: number
          equipment_id: string
          id: string
          is_active: boolean
          label: string
          requires_note: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number
          equipment_id: string
          id?: string
          is_active?: boolean
          label: string
          requires_note?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number
          equipment_id?: string
          id?: string
          is_active?: boolean
          label?: string
          requires_note?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "downtime_reasons_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          line_id: string
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          line_id: string
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          line_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          short_name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          id: string
          line_id: string
          name: string
          start_hour: number
          end_hour: number
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          line_id: string
          name: string
          start_hour: number
          end_hour: number
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          line_id?: string
          name?: string
          start_hour?: number
          end_hour?: number
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "lines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      downtime_by_day: {
        Args: {
          p_line_id: string
          p_start: string
          p_end: string
          p_timezone?: string
        }
        Returns: {
          day: string
          total_seconds: number
          event_count: number
        }[]
      }
      downtime_by_equipment: {
        Args: {
          p_line_id: string
          p_start: string
          p_end: string
        }
        Returns: {
          equipment_id: string
          equipment_name: string
          total_seconds: number
          event_count: number
        }[]
      }
      downtime_by_reason: {
        Args: {
          p_line_id: string
          p_start: string
          p_end: string
        }
        Returns: {
          reason_id: string
          reason_label: string
          total_seconds: number
          event_count: number
        }[]
      }
      downtime_summary: {
        Args: {
          p_line_id: string
          p_start: string
          p_end: string
        }
        Returns: {
          total_seconds: number
          event_count: number
        }[]
      }
      open_events: {
        Args: {
          p_line_id: string
        }
        Returns: {
          id: string
          equipment_id: string
          equipment_name: string
          started_at: string
        }[]
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
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
