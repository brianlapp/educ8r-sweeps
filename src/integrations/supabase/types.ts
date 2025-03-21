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
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      automated_sync_logs: {
        Row: {
          execution_time: string | null
          id: string
          job_name: string
          message: string | null
          status: string | null
        }
        Insert: {
          execution_time?: string | null
          id?: string
          job_name: string
          message?: string | null
          status?: string | null
        }
        Update: {
          execution_time?: string | null
          id?: string
          job_name?: string
          message?: string | null
          status?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string | null
          email_cta_text: string | null
          email_footer_message: string | null
          email_heading: string | null
          email_referral_message: string | null
          email_subject: string | null
          email_template_id: string
          end_date: string
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          meta_description: string | null
          meta_image: string | null
          meta_title: string | null
          meta_url: string | null
          mobile_subtitle: string | null
          prize_amount: string
          prize_name: string
          promotional_text: string | null
          share_description: string | null
          share_title: string | null
          slug: string
          source_id: string | null
          start_date: string
          subtitle: string | null
          target_audience: string
          thank_you_description: string
          thank_you_title: string
          title: string
          updated_at: string | null
          visible_in_admin: boolean | null
          why_share_items: Json | null
        }
        Insert: {
          created_at?: string | null
          email_cta_text?: string | null
          email_footer_message?: string | null
          email_heading?: string | null
          email_referral_message?: string | null
          email_subject?: string | null
          email_template_id: string
          end_date: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_image?: string | null
          meta_title?: string | null
          meta_url?: string | null
          mobile_subtitle?: string | null
          prize_amount: string
          prize_name: string
          promotional_text?: string | null
          share_description?: string | null
          share_title?: string | null
          slug: string
          source_id?: string | null
          start_date: string
          subtitle?: string | null
          target_audience: string
          thank_you_description: string
          thank_you_title: string
          title: string
          updated_at?: string | null
          visible_in_admin?: boolean | null
          why_share_items?: Json | null
        }
        Update: {
          created_at?: string | null
          email_cta_text?: string | null
          email_footer_message?: string | null
          email_heading?: string | null
          email_referral_message?: string | null
          email_subject?: string | null
          email_template_id?: string
          end_date?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          meta_description?: string | null
          meta_image?: string | null
          meta_title?: string | null
          meta_url?: string | null
          mobile_subtitle?: string | null
          prize_amount?: string
          prize_name?: string
          promotional_text?: string | null
          share_description?: string | null
          share_title?: string | null
          slug?: string
          source_id?: string | null
          start_date?: string
          subtitle?: string | null
          target_audience?: string
          thank_you_description?: string
          thank_you_title?: string
          title?: string
          updated_at?: string | null
          visible_in_admin?: boolean | null
          why_share_items?: Json | null
        }
        Relationships: []
      }
      email_migration: {
        Row: {
          created_at: string | null
          email: string
          error: string | null
          first_name: string | null
          id: string
          last_name: string | null
          migrated_at: string | null
          migration_batch: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          error?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          migrated_at?: string | null
          migration_batch?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          error?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          migrated_at?: string | null
          migration_batch?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_migration_automation: {
        Row: {
          created_at: string | null
          daily_total_target: number
          enabled: boolean
          end_hour: number
          id: string
          last_automated_run: string | null
          max_batch_size: number
          min_batch_size: number
          publication_id: string | null
          start_hour: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_total_target?: number
          enabled?: boolean
          end_hour?: number
          id?: string
          last_automated_run?: string | null
          max_batch_size?: number
          min_batch_size?: number
          publication_id?: string | null
          start_hour?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_total_target?: number
          enabled?: boolean
          end_hour?: number
          id?: string
          last_automated_run?: string | null
          max_batch_size?: number
          min_batch_size?: number
          publication_id?: string | null
          start_hour?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      email_migration_stats: {
        Row: {
          created_at: string | null
          failed_subscribers: number | null
          id: string
          last_batch_date: string | null
          last_batch_id: string | null
          migrated_subscribers: number | null
          total_subscribers: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          failed_subscribers?: number | null
          id?: string
          last_batch_date?: string | null
          last_batch_id?: string | null
          migrated_subscribers?: number | null
          total_subscribers?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          failed_subscribers?: number | null
          id?: string
          last_batch_date?: string | null
          last_batch_id?: string | null
          migrated_subscribers?: number | null
          total_subscribers?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      entries: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email: string
          entry_count: number | null
          first_name: string
          id: string
          last_name: string
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          total_entries: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email: string
          entry_count?: number | null
          first_name: string
          id?: string
          last_name: string
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email?: string
          entry_count?: number | null
          first_name?: string
          id?: string
          last_name?: string
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "entry_stats"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "referral_debug"
            referencedColumns: ["referral_code"]
          },
        ]
      }
      entries_backup: {
        Row: {
          created_at: string | null
          email: string | null
          entry_count: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          total_entries: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          entry_count?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          entry_count?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referral_conversions: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_referral_code_fkey"
            columns: ["referral_code"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "referral_conversions_referral_code_fkey"
            columns: ["referral_code"]
            isOneToOne: false
            referencedRelation: "entry_stats"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "referral_conversions_referral_code_fkey"
            columns: ["referral_code"]
            isOneToOne: false
            referencedRelation: "referral_debug"
            referencedColumns: ["referral_code"]
          },
        ]
      }
      referral_conversions_backup: {
        Row: {
          created_at: string | null
          id: string | null
          referral_code: string | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          referral_code?: string | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          referral_code?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      sheets_sync_metadata: {
        Row: {
          created_at: string | null
          entries_synced: number | null
          id: string
          last_sync_time: string | null
          last_sync_type: string | null
          total_entries_synced: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entries_synced?: number | null
          id: string
          last_sync_time?: string | null
          last_sync_type?: string | null
          total_entries_synced?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entries_synced?: number | null
          id?: string
          last_sync_time?: string | null
          last_sync_type?: string | null
          total_entries_synced?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      entry_stats: {
        Row: {
          created_at: string | null
          email: string | null
          entry_count: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          referral_code: string | null
          referral_count: number | null
          referred_by: string | null
          total_entries: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          entry_count?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          entry_count?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_count?: number | null
          referred_by?: string | null
          total_entries?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "entry_stats"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "referral_debug"
            referencedColumns: ["referral_code"]
          },
        ]
      }
      referral_debug: {
        Row: {
          created_at: string | null
          email: string | null
          referral_code: string | null
          referred_by: string | null
          referrer_email: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "entry_stats"
            referencedColumns: ["referral_code"]
          },
          {
            foreignKeyName: "entries_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "referral_debug"
            referencedColumns: ["referral_code"]
          },
        ]
      }
    }
    Functions: {
      create_sheets_sync_metadata_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_clean_referral_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_everflow_webhook: {
        Args: {
          payload: Json
        }
        Returns: Json
      }
      import_subscribers: {
        Args: {
          subscribers_data: Json
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
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
