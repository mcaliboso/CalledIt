import { createClient } from '@/lib/supabase/server'
import type { Bet, BetWithWagers } from '@/lib/types/bet.types'

export async function getBetsByGroup(groupId: string): Promise<BetWithWagers[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bets')
    .select(`
      *,
      sports_event:sports_events (*),
      creator:profiles!bets_created_by_fkey (
        username,
        display_name,
        avatar_url
      ),
      wagers (
        id,
        user_id,
        points_wagered,
        prediction,
        outcome,
        points_delta,
        created_at,
        user:profiles!wagers_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as unknown as BetWithWagers[]) ?? []
}

export async function getBetById(betId: string): Promise<BetWithWagers | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bets')
    .select(`
      *,
      sports_event:sports_events (*),
      creator:profiles!bets_created_by_fkey (
        username,
        display_name,
        avatar_url
      ),
      wagers (
        *,
        user:profiles!wagers_user_id_fkey (
          username,
          display_name,
          avatar_url
        )
      )
    `)
    .eq('id', betId)
    .single()

  if (error) return null
  return data as unknown as BetWithWagers
}

export async function getUserWagerForBet(betId: string, userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('wagers')
    .select('*')
    .eq('bet_id', betId)
    .eq('user_id', userId)
    .single()

  return data
}
