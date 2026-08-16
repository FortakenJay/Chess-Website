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
          strategy_stats: Json | null
          endgame_accuracy_stats: Json | null
          analysis_version: number | null
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
          strategy_stats?: Json | null
          endgame_accuracy_stats?: Json | null
          analysis_version?: number | null
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
          strategy_stats?: Json | null
          endgame_accuracy_stats?: Json | null
          analysis_version?: number | null
        }
        Relationships: []
      }
      node_progress: {
        Row: {
          due_at: string
          lapses: number
          last_recall_pass: boolean | null
          last_understanding_pass: boolean | null
          node_id: string
          recall_ease: number
          streak: number
          understanding_ease: number
          updated_at: string
          user_id: string
        }
        Insert: {
          due_at?: string
          lapses?: number
          last_recall_pass?: boolean | null
          last_understanding_pass?: boolean | null
          node_id: string
          recall_ease?: number
          streak?: number
          understanding_ease?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          due_at?: string
          lapses?: number
          last_recall_pass?: boolean | null
          last_understanding_pass?: boolean | null
          node_id?: string
          recall_ease?: number
          streak?: number
          understanding_ease?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'node_progress_node_id_fkey'
            columns: ['node_id']
            isOneToOne: false
            referencedRelation: 'opening_nodes'
            referencedColumns: ['id']
          },
        ]
      }
      opening_explorer_cache: {
        Row: {
          corpus: string
          fen: string
          fetched_at: string
          payload: Json
          rating_band: string
        }
        Insert: {
          corpus: string
          fen: string
          fetched_at?: string
          payload: Json
          rating_band: string
        }
        Update: {
          corpus?: string
          fen?: string
          fetched_at?: string
          payload?: Json
          rating_band?: string
        }
        Relationships: []
      }
      opening_generation_jobs: {
        Row: {
          created_at: string
          cursor: Json | null
          done_count: number
          error: string | null
          generator_version: number
          id: string
          opening_id: string | null
          opening_name: string
          pack_key: string
          paused: boolean
          rating_band: string
          requested_scope: Json
          side: string
          stage: string
          total_count: number
          updated_at: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          cursor?: Json | null
          done_count?: number
          error?: string | null
          generator_version: number
          id?: string
          opening_id?: string | null
          opening_name: string
          pack_key: string
          paused?: boolean
          rating_band?: string
          requested_scope?: Json
          side: string
          stage?: string
          total_count?: number
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          cursor?: Json | null
          done_count?: number
          error?: string | null
          generator_version?: number
          id?: string
          opening_id?: string | null
          opening_name?: string
          pack_key?: string
          paused?: boolean
          rating_band?: string
          requested_scope?: Json
          side?: string
          stage?: string
          total_count?: number
          updated_at?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'opening_generation_jobs_opening_id_fkey'
            columns: ['opening_id']
            isOneToOne: false
            referencedRelation: 'openings'
            referencedColumns: ['id']
          },
        ]
      }
      opening_nodes: {
        Row: {
          alternatives: Json
          commentary: Json | null
          explorer_stats: Json | null
          fen: string
          frequency_weight: number
          id: string
          is_mine: boolean
          opening_id: string
          parent_node_id: string | null
          ply: number
          reason_tags: string[]
          reason_text: string | null
          san: string
          source: string
        }
        Insert: {
          alternatives?: Json
          commentary?: Json | null
          explorer_stats?: Json | null
          fen: string
          frequency_weight?: number
          id?: string
          is_mine: boolean
          opening_id: string
          parent_node_id?: string | null
          ply: number
          reason_tags?: string[]
          reason_text?: string | null
          san?: string
          source?: string
        }
        Update: {
          alternatives?: Json
          commentary?: Json | null
          explorer_stats?: Json | null
          fen?: string
          frequency_weight?: number
          id?: string
          is_mine?: boolean
          opening_id?: string
          parent_node_id?: string | null
          ply?: number
          reason_tags?: string[]
          reason_text?: string | null
          san?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: 'opening_nodes_opening_id_fkey'
            columns: ['opening_id']
            isOneToOne: false
            referencedRelation: 'openings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'opening_nodes_parent_node_id_fkey'
            columns: ['parent_node_id']
            isOneToOne: false
            referencedRelation: 'opening_nodes'
            referencedColumns: ['id']
          },
        ]
      }
      opening_packs: {
        Row: {
          created_at: string
          generator_version: number
          opening_name: string
          pack_key: string
          payload: Json
          rating_band: string
          side: string
        }
        Insert: {
          created_at?: string
          generator_version: number
          opening_name: string
          pack_key: string
          payload: Json
          rating_band: string
          side: string
        }
        Update: {
          created_at?: string
          generator_version?: number
          opening_name?: string
          pack_key?: string
          payload?: Json
          rating_band?: string
          side?: string
        }
        Relationships: []
      }
      openings: {
        Row: {
          center_type: string | null
          created_at: string
          eco: string | null
          generation_status: string | null
          generator_version: number | null
          id: string
          knowledge_card: Json
          name: string
          pack_key: string | null
          parent_id: string | null
          side: string
          structure_family: string | null
          theory_load: number
          username: string | null
        }
        Insert: {
          center_type?: string | null
          created_at?: string
          eco?: string | null
          generation_status?: string | null
          generator_version?: number | null
          id?: string
          knowledge_card?: Json
          name: string
          pack_key?: string | null
          parent_id?: string | null
          side: string
          structure_family?: string | null
          theory_load?: number
          username?: string | null
        }
        Update: {
          center_type?: string | null
          created_at?: string
          eco?: string | null
          generation_status?: string | null
          generator_version?: number | null
          id?: string
          knowledge_card?: Json
          name?: string
          pack_key?: string | null
          parent_id?: string | null
          side?: string
          structure_family?: string | null
          theory_load?: number
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'openings_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'openings'
            referencedColumns: ['id']
          },
        ]
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
          avatar_url: string | null
          chess_com_username: string
          created_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          chess_com_username: string
          created_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
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
      structure_targets: {
        Row: {
          my_breaks: string[]
          my_good_squares: string[]
          my_problem_piece: string | null
          opening_id: string
          tempo_traps: string[]
          their_breaks: string[]
          their_good_squares: string[]
          their_problem_piece: string | null
          typical_endgame: string | null
        }
        Insert: {
          my_breaks?: string[]
          my_good_squares?: string[]
          my_problem_piece?: string | null
          opening_id: string
          tempo_traps?: string[]
          their_breaks?: string[]
          their_good_squares?: string[]
          their_problem_piece?: string | null
          typical_endgame?: string | null
        }
        Update: {
          my_breaks?: string[]
          my_good_squares?: string[]
          my_problem_piece?: string | null
          opening_id?: string
          tempo_traps?: string[]
          their_breaks?: string[]
          their_good_squares?: string[]
          their_problem_piece?: string | null
          typical_endgame?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'structure_targets_opening_id_fkey'
            columns: ['opening_id']
            isOneToOne: true
            referencedRelation: 'openings'
            referencedColumns: ['id']
          },
        ]
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
      normalize_time_class: {
        Args: { value: string | null }
        Returns: string
      }
      strategy_peer_stats: {
        Args: {
          viewed_username: string
          p_time_class?: string | null
          p_structure?: string | null
        }
        Returns: Json
      }
      endgame_peer_stats: {
        Args: {
          viewed_username: string
          p_time_class?: string | null
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

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
