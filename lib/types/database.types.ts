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
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          invite_code: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          invite_code?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'member'
          points: number
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'admin' | 'member'
          points?: number
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          points?: number
          joined_at?: string
        }
        Relationships: []
      }
      sports_events: {
        Row: {
          id: string
          external_id: string
          sport: string
          league: string
          home_team: string
          away_team: string
          commence_time: string
          status: 'upcoming' | 'live' | 'completed' | 'cancelled'
          home_score: number | null
          away_score: number | null
          raw_data: Json | null
          last_synced_at: string
        }
        Insert: {
          id?: string
          external_id: string
          sport: string
          league: string
          home_team: string
          away_team: string
          commence_time: string
          status?: 'upcoming' | 'live' | 'completed' | 'cancelled'
          home_score?: number | null
          away_score?: number | null
          raw_data?: Json | null
          last_synced_at?: string
        }
        Update: {
          id?: string
          external_id?: string
          sport?: string
          league?: string
          home_team?: string
          away_team?: string
          commence_time?: string
          status?: 'upcoming' | 'live' | 'completed' | 'cancelled'
          home_score?: number | null
          away_score?: number | null
          raw_data?: Json | null
          last_synced_at?: string
        }
        Relationships: []
      }
      bets: {
        Row: {
          id: string
          group_id: string
          created_by: string
          title: string
          description: string | null
          bet_type: 'over_under' | 'closest_guess' | 'spread' | 'moneyline' | 'custom'
          status: 'open' | 'locked' | 'settled' | 'cancelled'
          sports_event_id: string | null
          config: Json
          correct_answer: string | null
          settled_at: string | null
          settled_by: string | null
          closes_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          created_by: string
          title: string
          description?: string | null
          bet_type: 'over_under' | 'closest_guess' | 'spread' | 'moneyline' | 'custom'
          status?: 'open' | 'locked' | 'settled' | 'cancelled'
          sports_event_id?: string | null
          config?: Json
          correct_answer?: string | null
          settled_at?: string | null
          settled_by?: string | null
          closes_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          created_by?: string
          title?: string
          description?: string | null
          bet_type?: 'over_under' | 'closest_guess' | 'spread' | 'moneyline' | 'custom'
          status?: 'open' | 'locked' | 'settled' | 'cancelled'
          sports_event_id?: string | null
          config?: Json
          correct_answer?: string | null
          settled_at?: string | null
          settled_by?: string | null
          closes_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      wagers: {
        Row: {
          id: string
          bet_id: string
          group_id: string
          user_id: string
          points_wagered: number
          prediction: string
          outcome: 'won' | 'lost' | 'push' | 'pending'
          points_delta: number | null
          created_at: string
        }
        Insert: {
          id?: string
          bet_id: string
          group_id: string
          user_id: string
          points_wagered: number
          prediction: string
          outcome?: 'won' | 'lost' | 'push' | 'pending'
          points_delta?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          bet_id?: string
          group_id?: string
          user_id?: string
          points_wagered?: number
          prediction?: string
          outcome?: 'won' | 'lost' | 'push' | 'pending'
          points_delta?: number | null
          created_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          id: string
          group_id: string
          user_id: string
          wager_id: string | null
          delta: number
          balance_after: number
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          wager_id?: string | null
          delta: number
          balance_after: number
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          wager_id?: string | null
          delta?: number
          balance_after?: number
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      settle_bet: {
        Args: {
          p_bet_id: string
          p_correct_answer: string
        }
        Returns: {
          success: boolean
          error: string | null
        }[]
      }
      auto_settle_bet: {
        Args: {
          p_bet_id: string
          p_correct_answer: string
          p_settled_by: string
        }
        Returns: {
          success: boolean
          error: string | null
        }[]
      }
      place_wager: {
        Args: {
          p_bet_id: string
          p_points_wagered: number
          p_prediction: string
        }
        Returns: {
          success: boolean
          wager_id: string | null
          error: string | null
        }[]
      }
      join_group: {
        Args: {
          p_invite_code: string
        }
        Returns: {
          success: boolean
          group_id: string | null
          error: string | null
        }[]
      }
      create_group: {
        Args: {
          p_name: string
          p_description: string | null
          p_invite_code: string
        }
        Returns: {
          success: boolean
          group_id: string | null
          error: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
