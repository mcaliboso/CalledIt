import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { settleBetSchema } from '@/lib/validators/bet'
import { settleBet } from '@/lib/services/bet-settlement.service'
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
    const parsed = settleBetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(apiError(parsed.error.flatten().formErrors[0] ?? 'Invalid input'), { status: 400 })
    }

    // settleBet derives settler from auth.uid() inside the SQL function
    const result = await settleBet(betId, parsed.data.correct_answer)

    if (!result.success) {
      return NextResponse.json(apiError(result.error ?? 'Failed to settle bet'), { status: 400 })
    }

    return NextResponse.json(apiSuccess({ settled: true }))
  } catch (err) {
    console.error('POST /api/bets/[betId]/settle error:', err)
    return NextResponse.json(apiError('Failed to settle bet'), { status: 500 })
  }
}
