import { NextRequest, NextResponse } from 'next/server'
import { syncSportsEvents } from '@/lib/services/sports-sync.service'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedSecret) {
    return NextResponse.json(apiError('Unauthorized'), { status: 401 })
  }

  try {
    const result = await syncSportsEvents()
    return NextResponse.json(apiSuccess(result))
  } catch (err) {
    console.error('Cron sync-events error:', err)
    return NextResponse.json(apiError('Sync failed'), { status: 500 })
  }
}
