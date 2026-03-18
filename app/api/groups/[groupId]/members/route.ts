import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGroupLeaderboard } from '@/lib/repositories/groups'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
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

    const leaderboard = await getGroupLeaderboard(groupId)
    return NextResponse.json(apiSuccess(leaderboard))
  } catch (err) {
    console.error('GET /api/groups/[groupId]/members error:', err)
    return NextResponse.json(apiError('Failed to fetch members'), { status: 500 })
  }
}
