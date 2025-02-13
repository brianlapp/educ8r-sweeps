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
      entries: {
        Row: {
          created_at: string | null
          email: string
          entry_count: number | null
          first_name: string
          id: string
          last_name: string
          referral_code: string | null
          referred_by: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          entry_count?: number | null
          first_name: string
          id?: string
          last_name: string
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          entry_count?: number | null
          first_name?: string
          id?: string
          last_name?: string
          referral_code?: string | null
          referred_by?: string | null
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
        ]
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
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          entry_count?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_count?: never
          referred_by?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          entry_count?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          referral_code?: string | null
          referral_count?: never
          referred_by?: string | null
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
        ]
      }
    }
    Functions: {
      handle_everflow_postback: {
        Args: {
          ref_code: string
          trans_id: string
        }
        Returns: undefined
      }
      handle_everflow_webhook: {
        Args: {
          payload: Json
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
