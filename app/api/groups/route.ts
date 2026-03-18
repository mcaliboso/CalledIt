import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGroupSchema } from '@/lib/validators/group'
import { generateInviteCode } from '@/lib/utils/invite-code'
import { getUserGroups } from '@/lib/repositories/groups'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
    }

    const groups = await getUserGroups(user.id)
    return NextResponse.json(apiSuccess(groups))
  } catch (err) {
    console.error('GET /api/groups error:', err)
    return NextResponse.json(apiError('Failed to fetch groups'), { status: 500 })
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
    const parsed = createGroupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(apiError(parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 })
    }

    // Generate invite code with collision retry
    let inviteCode = generateInviteCode()
    let attempts = 0
    const MAX_ATTEMPTS = 5

    while (attempts < MAX_ATTEMPTS) {
      // create_group derives user from auth.uid() inside SQL
      const { data, error } = await supabase.rpc('create_group', {
        p_name: parsed.data.name,
        p_description: parsed.data.description ?? null,
        p_invite_code: inviteCode,
      })

      if (error) {
        return NextResponse.json(apiError(error.message), { status: 500 })
      }

      const result = Array.isArray(data) ? data[0] : data

      if (result?.success) {
        return NextResponse.json(apiSuccess({ group_id: result.group_id }), { status: 201 })
      }

      if (result?.error?.includes('Invite code')) {
        inviteCode = generateInviteCode()
        attempts++
      } else {
        return NextResponse.json(apiError(result?.error ?? 'Failed to create group'), { status: 500 })
      }
    }

    return NextResponse.json(apiError('Failed to generate unique invite code'), { status: 500 })
  } catch (err) {
    console.error('POST /api/groups error:', err)
    return NextResponse.json(apiError('Failed to create group'), { status: 500 })
  }
}
