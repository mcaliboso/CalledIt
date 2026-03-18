import { NextRequest, NextResponse } from 'next/server'
import { autoSettleCompletedBets } from '@/lib/services/sports-sync.service'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedSecret) {
    return NextResponse.json(apiError('Unauthorized'), { status: 401 })
  }

  try {
    const result = await autoSettleCompletedBets()
    return NextResponse.json(apiSuccess(result))
  } catch (err) {
    console.error('Cron settle-bets error:', err)
    return NextResponse.json(apiError('Settlement failed'), { status: 500 })
  }
}
