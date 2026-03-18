import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBetSchema } from '@/lib/validators/bet'
import { getBetsByGroup } from '@/lib/repositories/bets'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json(apiError('groupId is required'), { status: 400 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(apiError('Not a member of this group'), { status: 403 })
    }

    const bets = await getBetsByGroup(groupId)
    return NextResponse.json(apiSuccess(bets))
  } catch (err) {
    console.error('GET /api/bets error:', err)
    return NextResponse.json(apiError('Failed to fetch bets'), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
    }

    const body = await request.json()
    const parsed = createBetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(apiError(parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', parsed.data.group_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(apiError('Not a member of this group'), { status: 403 })
    }

    const { data: bet, error } = await supabase
      .from('bets')
      .insert({
        group_id: parsed.data.group_id,
        created_by: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        bet_type: parsed.data.bet_type,
        sports_event_id: parsed.data.sports_event_id ?? null,
        config: parsed.data.config as unknown as import('@/lib/types/database.types').Json,
        closes_at: parsed.data.closes_at ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(apiError(error.message), { status: 500 })
    }

    return NextResponse.json(apiSuccess(bet), { status: 201 })
  } catch (err) {
    console.error('POST /api/bets error:', err)
    return NextResponse.json(apiError('Failed to create bet'), { status: 500 })
  }
}
