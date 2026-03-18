import { createClient } from '@/lib/supabase/server'
import type { PointTransaction } from '@/lib/types/bet.types'

export async function getUserPointHistory(
  userId: string,
  groupId: string,
  limit = 20
): Promise<PointTransaction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getCurrentPoints(userId: string, groupId: string): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('group_members')
    .select('points')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single()

  return data?.points ?? 0
}
