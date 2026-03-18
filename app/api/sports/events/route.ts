import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUpcomingEvents } from '@/lib/repositories/sports-events'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') ?? undefined
    const from = searchParams.get('from') ?? undefined
    const to = searchParams.get('to') ?? undefined

    const events = await getUpcomingEvents(sport, from, to)
    return NextResponse.json(apiSuccess(events))
  } catch (err) {
    console.error('GET /api/sports/events error:', err)
    return NextResponse.json(apiError('Failed to fetch events'), { status: 500 })
  }
}
