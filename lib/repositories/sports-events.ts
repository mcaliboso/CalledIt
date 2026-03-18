import { createClient } from '@/lib/supabase/server'
import type { SportsEvent } from '@/lib/types/bet.types'

export async function getUpcomingEvents(sport?: string, from?: string, to?: string): Promise<SportsEvent[]> {
  const supabase = await createClient()

  let query = supabase
    .from('sports_events')
    .select('*')
    .in('status', ['upcoming', 'live'])
    .order('commence_time', { ascending: true })

  if (sport) {
    query = query.eq('sport', sport)
  }

  if (from) {
    query = query.gte('commence_time', from)
  }

  if (to) {
    query = query.lte('commence_time', to)
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return (data ?? []) as SportsEvent[]
}
