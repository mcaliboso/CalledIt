import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joinGroupSchema } from '@/lib/validators/group'
import { apiSuccess, apiError } from '@/lib/types/api.types'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(apiError('Unauthorized'), { status: 401 })
    }

    const body = await request.json()
    const parsed = joinGroupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(apiError(parsed.error.flatten().formErrors[0] ?? parsed.error.issues[0]?.message ?? "Invalid input"), { status: 400 })
    }

    // join_group derives user from auth.uid() inside SQL
    const { data, error } = await supabase.rpc('join_group', {
      p_invite_code: parsed.data.invite_code,
    })

    if (error) {
      return NextResponse.json(apiError(error.message), { status: 500 })
    }

    const result = Array.isArray(data) ? data[0] : data

    if (!result?.success) {
      return NextResponse.json(apiError(result?.error ?? 'Failed to join group'), { status: 400 })
    }

    return NextResponse.json(apiSuccess({ group_id: result.group_id }))
  } catch (err) {
    console.error('POST /api/groups/join error:', err)
    return NextResponse.json(apiError('Failed to join group'), { status: 500 })
  }
}
