import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database.types'

const FETCH_TIMEOUT_MS = 10_000

interface OddsApiEvent {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  completed?: boolean
}

interface SyncResult {
  synced: number
  errors: string[]
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function syncSportsEvents(): Promise<SyncResult> {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    return { synced: 0, errors: ['ODDS_API_KEY not configured'] }
  }

  const errors: string[] = []
  let synced = 0

  const sports = ['americanfootball_nfl', 'basketball_nba', 'baseball_mlb', 'icehockey_nhl', 'soccer_epl']

  for (const sportKey of sports) {
    try {
      // Pass API key as header — not in URL — to prevent key leakage in logs
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/events?dateFormat=iso`
      const res = await fetchWithTimeout(url, {
        headers: { 'x-api-key': apiKey },
      })

      if (!res.ok) {
        errors.push(`Failed to fetch ${sportKey}: HTTP ${res.status}`)
        continue
      }

      const events: OddsApiEvent[] = await res.json()
      const supabase = await createClient()

      for (const event of events) {
        const { error } = await supabase
          .from('sports_events')
          .upsert({
            external_id: event.id,
            sport: event.sport_key,
            league: event.sport_title,
            home_team: event.home_team,
            away_team: event.away_team,
            commence_time: event.commence_time,
            status: event.completed ? 'completed' as const : 'upcoming' as const,
            raw_data: event as unknown as Json,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'external_id' })

        if (error) {
          errors.push(`Failed to upsert event ${event.id}: ${error.message}`)
        } else {
          synced++
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        errors.push(`Timeout fetching ${sportKey}`)
      } else {
        errors.push(`Error processing ${sportKey}: ${String(err)}`)
      }
    }
  }

  return { synced, errors }
}

export async function autoSettleCompletedBets(): Promise<{ settled: number; errors: string[] }> {
  const supabase = await createClient()
  const errors: string[] = []
  let settled = 0

  // Find open bets tied to sports events
  const { data: bets } = await supabase
    .from('bets')
    .select('id, bet_type, config, created_by, sports_event_id')
    .in('status', ['open', 'locked'])
    .not('sports_event_id', 'is', null)

  if (!bets || bets.length === 0) return { settled, errors }

  const eventIds = bets.map((b) => b.sports_event_id).filter((id): id is string => id !== null)

  const { data: events } = await supabase
    .from('sports_events')
    .select('id, status, home_score, away_score, home_team, away_team')
    .in('id', eventIds)
    .eq('status', 'completed')

  if (!events || events.length === 0) return { settled, errors }

  const eventMap = events.reduce<Record<string, typeof events[0]>>((acc, e) => {
    acc[e.id] = e
    return acc
  }, {})

  for (const bet of bets) {
    if (!bet.sports_event_id) continue
    const event = eventMap[bet.sports_event_id]
    if (!event) continue
    if (event.home_score === null || event.away_score === null) continue

    let correctAnswer: string | null = null
    const config = bet.config as Record<string, unknown>

    if (bet.bet_type === 'moneyline') {
      correctAnswer = event.home_score > event.away_score ? event.home_team : event.away_team
    } else if (bet.bet_type === 'over_under') {
      correctAnswer = String(event.home_score + event.away_score)
    } else if (bet.bet_type === 'spread') {
      const diff = event.home_score - event.away_score
      const spread = Number(config.spread)
      correctAnswer = diff > spread ? event.home_team : event.away_team
    } else {
      continue  // custom/closest_guess require manual settlement
    }

    if (!correctAnswer) continue

    // Use auto_settle_bet — separate from settle_bet which requires auth session
    const { error } = await supabase.rpc('auto_settle_bet', {
      p_bet_id: bet.id,
      p_correct_answer: correctAnswer,
      p_settled_by: bet.created_by,
    })

    if (error) {
      errors.push(`Failed to settle bet ${bet.id}: ${error.message}`)
    } else {
      settled++
    }
  }

  return { settled, errors }
}
