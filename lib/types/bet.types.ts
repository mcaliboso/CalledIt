import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type SportsEvent = Database['public']['Tables']['sports_events']['Row']
export type Bet = Database['public']['Tables']['bets']['Row']
export type Wager = Database['public']['Tables']['wagers']['Row']
export type PointTransaction = Database['public']['Tables']['point_transactions']['Row']

export type BetType = Bet['bet_type']
export type BetStatus = Bet['status']
export type WagerOutcome = Wager['outcome']
export type GroupRole = GroupMember['role']

// Over/Under config
export interface OverUnderConfig {
  line: number
  unit: string  // e.g., "points", "yards", "goals"
}

// Closest Guess config
export interface ClosestGuessConfig {
  actual_value?: number
  tie_break: 'split_pot' | 'first_guess_wins' | 'push'
  unit: string
}

// Spread config
export interface SpreadConfig {
  favorite_team: string
  spread: number  // positive = favorite gives points
}

// Moneyline config
export interface MoneylineConfig {
  home_odds: number  // American odds
  away_odds: number
}

// Custom bet config
export interface CustomConfig {
  options: string[]  // possible predictions
}

export type BetConfig = OverUnderConfig | ClosestGuessConfig | SpreadConfig | MoneylineConfig | CustomConfig

// Extended types with relations
export interface BetWithWagers extends Bet {
  wagers?: WagerWithUser[]
  sports_event?: SportsEvent | null
  creator?: Profile | null
}

export interface WagerWithUser extends Wager {
  user?: Profile | null
}

export interface GroupWithMembers extends Group {
  members?: GroupMemberWithProfile[]
  member_count?: number
}

export interface GroupMemberWithProfile extends GroupMember {
  profile?: Profile | null
}

export interface LeaderboardEntry {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  points: number
  rank: number
  wagers_won: number
  wagers_total: number
}
