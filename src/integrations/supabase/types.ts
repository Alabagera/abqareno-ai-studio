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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assistant_attachments: {
        Row: {
          asset_id: string
          created_at: string
          created_by: string
          id: string
          message_id: string | null
          thread_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by?: string
          id?: string
          message_id?: string | null
          thread_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by?: string
          id?: string
          message_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_attachments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_attachments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          mode: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          mode?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          mode?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      avatar_profiles: {
        Row: {
          cover_asset_id: string | null
          created_at: string
          created_by: string | null
          id: string
          image_asset_ids: string[]
          model: string
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_asset_ids?: string[]
          model?: string
          name: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cover_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_asset_ids?: string[]
          model?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatar_profiles_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_projects: {
        Row: {
          created_at: string
          created_by: string
          data: Json
          duration_seconds: number | null
          export_path: string | null
          id: string
          owner_id: string
          thumb_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          data?: Json
          duration_seconds?: number | null
          export_path?: string | null
          id?: string
          owner_id?: string
          thumb_path?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data?: Json
          duration_seconds?: number | null
          export_path?: string | null
          id?: string
          owner_id?: string
          thumb_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_tasks: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          notes: string
          remind_at: string | null
          repeat: string
          title: string
          tone: string
          tone_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string
          remind_at?: string | null
          repeat?: string
          title: string
          tone?: string
          tone_path?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          notes?: string
          remind_at?: string | null
          repeat?: string
          title?: string
          tone?: string
          tone_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path: string
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      model_endpoints: {
        Row: {
          access_token: string | null
          enabled: boolean
          endpoint_url: string
          id: string
          last_checked_at: string | null
          last_status: string | null
          model_id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          enabled?: boolean
          endpoint_url?: string
          id?: string
          last_checked_at?: string | null
          last_status?: string | null
          model_id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          enabled?: boolean
          endpoint_url?: string
          id?: string
          last_checked_at?: string | null
          last_status?: string | null
          model_id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          max_minutes_per_video: number | null
          max_videos: number | null
          member_id: string | null
          owner_id: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          max_minutes_per_video?: number | null
          max_videos?: number | null
          member_id?: string | null
          owner_id: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          max_minutes_per_video?: number | null
          max_videos?: number | null
          member_id?: string | null
          owner_id?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_projects: {
        Row: {
          aspect_ratio: string
          audio_asset_id: string | null
          avatar_asset_id: string | null
          avatar_model: string
          avatar_profile_id: string | null
          background_asset_id: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          id: string
          language: string
          logo_asset_id: string | null
          logo_style: Json
          output_path: string | null
          platform: string | null
          script_text: string | null
          status: string
          subtitle_style: Json
          subtitles_enabled: boolean
          text_overlays: Json
          title: string
          title_overlay: Json
          translate_to: string | null
          translation_style: Json
          updated_at: string
          user_id: string
          voice_model: string
          voice_profile_id: string | null
        }
        Insert: {
          aspect_ratio?: string
          audio_asset_id?: string | null
          avatar_asset_id?: string | null
          avatar_model?: string
          avatar_profile_id?: string | null
          background_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          language?: string
          logo_asset_id?: string | null
          logo_style?: Json
          output_path?: string | null
          platform?: string | null
          script_text?: string | null
          status?: string
          subtitle_style?: Json
          subtitles_enabled?: boolean
          text_overlays?: Json
          title: string
          title_overlay?: Json
          translate_to?: string | null
          translation_style?: Json
          updated_at?: string
          user_id?: string
          voice_model?: string
          voice_profile_id?: string | null
        }
        Update: {
          aspect_ratio?: string
          audio_asset_id?: string | null
          avatar_asset_id?: string | null
          avatar_model?: string
          avatar_profile_id?: string | null
          background_asset_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          id?: string
          language?: string
          logo_asset_id?: string | null
          logo_style?: Json
          output_path?: string | null
          platform?: string | null
          script_text?: string | null
          status?: string
          subtitle_style?: Json
          subtitles_enabled?: boolean
          text_overlays?: Json
          title?: string
          title_overlay?: Json
          translate_to?: string | null
          translation_style?: Json
          updated_at?: string
          user_id?: string
          voice_model?: string
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_projects_audio_asset_id_fkey"
            columns: ["audio_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_projects_avatar_asset_id_fkey"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_projects_avatar_profile_id_fkey"
            columns: ["avatar_profile_id"]
            isOneToOne: false
            referencedRelation: "avatar_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_projects_background_asset_id_fkey"
            columns: ["background_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_projects_logo_asset_id_fkey"
            columns: ["logo_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_projects_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          enhancement: Json
          id: string
          model: string
          name: string
          owner_id: string
          primary_sample_asset_id: string | null
          sample_asset_ids: string[]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enhancement?: Json
          id?: string
          model?: string
          name: string
          owner_id?: string
          primary_sample_asset_id?: string | null
          sample_asset_ids?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enhancement?: Json
          id?: string
          model?: string
          name?: string
          owner_id?: string
          primary_sample_asset_id?: string | null
          sample_asset_ids?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_primary_sample_asset_id_fkey"
            columns: ["primary_sample_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_primary_owner: { Args: never; Returns: boolean }
      can_manage_models: { Args: never; Returns: boolean }
      can_see_content: {
        Args: { _creator: string; _owner: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_usage: { Args: never; Returns: Json }
      my_workspace_access: { Args: never; Returns: Json }
      workspace_owner_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "admin" | "editor" | "viewer"
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
  public: {
    Enums: {
      app_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
