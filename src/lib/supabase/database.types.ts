export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      drill_attempts: {
        Row: {
          attempted_at: string
          id: string
          matched_best: boolean
          matched_historical_mistake: boolean
          position_id: string
          username: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          matched_best: boolean
          matched_historical_mistake: boolean
          position_id: string
          username: string
        }
        Update: {
          attempted_at?: string
          id?: string
          matched_best?: boolean
          matched_historical_mistake?: boolean
          position_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: 'drill_attempts_position_id_fkey'
            columns: ['position_id']
            isOneToOne: false
            referencedRelation: 'flagged_positions'
            referencedColumns: ['id']
          },
        ]
      }
      flagged_positions: {
        Row: {
          classification: string
          clock_left: number | null
          color: string
          endgame_type: string | null
          fen_before: string
          game_link: string
          id: string
          loss: number
          motif: string | null
          motif_kind: string | null
          move_number: number
          opponent: string
          phase: string
          played_on: string
          quality: string | null
          san: string
          time_class: string | null
          username: string
        }
        Insert: {
          classification: string
          clock_left?: number | null
          color: string
          endgame_type?: string | null
          fen_before: string
          game_link: string
          id?: string
          loss: number
          motif?: string | null
          motif_kind?: string | null
          move_number: number
          opponent: string
          phase: string
          played_on: string
          quality?: string | null
          san: string
          time_class?: string | null
          username: string
        }
        Update: {
          classification?: string
          clock_left?: number | null
          color?: string
          endgame_type?: string | null
          fen_before?: string
          game_link?: string
          id?: string
          loss?: number
          motif?: string | null
          motif_kind?: string | null
          move_number?: number
          opponent?: string
          phase?: string
          played_on?: string
          quality?: string | null
          san?: string
          time_class?: string | null
          username?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          accuracy_pct: number
          acpl: number
          analysis_budget: Json | null
          blunder_count: number
          clock_stats: Json
          color: string
          endgame_conversion: Json
          endgame_stats: Json
          game_link: string
          id: string
          inaccuracy_count: number
          mistake_count: number
          move_ep_losses: Json
          opening_eco: string | null
          opening_name: string | null
          opponent: string
          opponent_rating: number | null
          phase_acpl: Json
          phase_stats: Json
          played_on: string
          quality_stats: Json
          recovery_stats: Json
          result: string
          time_class: string | null
          total_moves: number
          user_rating: number | null
          username: string
        }
        Insert: {
          accuracy_pct?: number
          acpl?: number
          analysis_budget?: Json | null
          blunder_count?: number
          clock_stats?: Json
          color: string
          endgame_conversion?: Json
          endgame_stats?: Json
          game_link: string
          id?: string
          inaccuracy_count?: number
          mistake_count?: number
          move_ep_losses?: Json
          opening_eco?: string | null
          opening_name?: string | null
          opponent: string
          opponent_rating?: number | null
          phase_acpl?: Json
          phase_stats?: Json
          played_on: string
          quality_stats?: Json
          recovery_stats?: Json
          result: string
          time_class?: string | null
          total_moves?: number
          user_rating?: number | null
          username: string
        }
        Update: {
          accuracy_pct?: number
          acpl?: number
          analysis_budget?: Json | null
          blunder_count?: number
          clock_stats?: Json
          color?: string
          endgame_conversion?: Json
          endgame_stats?: Json
          game_link?: string
          id?: string
          inaccuracy_count?: number
          mistake_count?: number
          move_ep_losses?: Json
          opening_eco?: string | null
          opening_name?: string | null
          opponent?: string
          opponent_rating?: number | null
          phase_acpl?: Json
          phase_stats?: Json
          played_on?: string
          quality_stats?: Json
          recovery_stats?: Json
          result?: string
          time_class?: string | null
          total_moves?: number
          user_rating?: number | null
          username?: string
        }
        Relationships: []
      }
      period_summary: {
        Row: {
          blunder_pct: number
          by_clock: Json
          by_color: Json
          by_phase: Json
          mistake_pct: number
          period_end: string
          period_start: string
          total_moves: number
          username: string
        }
        Insert: {
          blunder_pct: number
          by_clock?: Json
          by_color?: Json
          by_phase?: Json
          mistake_pct: number
          period_end: string
          period_start: string
          total_moves: number
          username: string
        }
        Update: {
          blunder_pct?: number
          by_clock?: Json
          by_color?: Json
          by_phase?: Json
          mistake_pct?: number
          period_end?: string
          period_start?: string
          total_moves?: number
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          chess_com_username: string
          created_at: string
          user_id: string
        }
        Insert: {
          chess_com_username: string
          created_at?: string
          user_id: string
        }
        Update: {
          chess_com_username?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      puzzles: {
        Row: {
          color: string
          created_at: string
          fen: string
          id: string
          motif: string | null
          phase: string
          rating: number | null
          solution: Json
          source: string
          themes: string[]
          url: string
        }
        Insert: {
          color: string
          created_at?: string
          fen: string
          id: string
          motif?: string | null
          phase: string
          rating?: number | null
          solution?: Json
          source: string
          themes?: string[]
          url: string
        }
        Update: {
          color?: string
          created_at?: string
          fen?: string
          id?: string
          motif?: string | null
          phase?: string
          rating?: number | null
          solution?: Json
          source?: string
          themes?: string[]
          url?: string
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          last_game_end_time: number | null
          last_synced_at: string | null
          username: string
        }
        Insert: {
          last_game_end_time?: number | null
          last_synced_at?: string | null
          username: string
        }
        Update: {
          last_game_end_time?: number | null
          last_synced_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      linked_username: { Args: never; Returns: string }
      link_chess_username: {
        Args: { p_username: string }
        Returns: Database['public']['Tables']['profiles']['Row']
      }
      purge_expired_games: {
        Args: { retention_years?: number }
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
