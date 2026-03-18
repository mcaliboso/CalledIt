import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { placeWagerSchema } from '@/lib/validators/wager'
import { placeWager } from '@/lib/services/bet-settlement.service'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ betId: string }> }
) {
  try {
    const { betId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
    }

    const body = await request.json()
    const parsed = placeWagerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(apiError(parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 })
    }

    // placeWager derives user from auth.uid() inside the SQL function
    const result = await placeWager(
      betId,
      parsed.data.points_wagered,
      parsed.data.prediction
    )

    if (!result.success) {
      return NextResponse.json(apiError(result.error ?? 'Failed to place wager'), { status: 400 })
    }

    return NextResponse.json(apiSuccess({ wager_id: result.wagerId }), { status: 201 })
  } catch (err) {
    console.error('POST /api/bets/[betId]/wager error:', err)
    return NextResponse.json(apiError('Failed to place wager'), { status: 500 })
  }
}
