import { createClient } from '@/lib/supabase/server'
import type { Wager } from '@/lib/types/bet.types'

export async function getWagersByBet(betId: string): Promise<Wager[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('wagers')
    .select('*')
    .eq('bet_id', betId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getUserPointsInGroup(userId: string, groupId: string): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('group_members')
    .select('points')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single()

  return data?.points ?? 0
}
