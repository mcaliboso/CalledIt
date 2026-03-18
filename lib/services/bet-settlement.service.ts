import { createClient } from '@/lib/supabase/server'

export interface SettleResult {
  success: boolean
  error?: string
}

export async function settleBet(
  betId: string,
  correctAnswer: string
): Promise<SettleResult> {
  const supabase = await createClient()

  // settle_bet derives settler from auth.uid() — no p_settled_by param
  const { data, error } = await supabase.rpc('settle_bet', {
    p_bet_id: betId,
    p_correct_answer: correctAnswer,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = Array.isArray(data) ? data[0] : data
  return {
    success: result?.success ?? false,
    error: result?.error ?? undefined,
  }
}

export async function placeWager(
  betId: string,
  pointsWagered: number,
  prediction: string
): Promise<{ success: boolean; wagerId?: string; error?: string }> {
  const supabase = await createClient()

  // place_wager derives user from auth.uid() — no p_user_id param
  const { data, error } = await supabase.rpc('place_wager', {
    p_bet_id: betId,
    p_points_wagered: pointsWagered,
    p_prediction: prediction,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  const result = Array.isArray(data) ? data[0] : data
  return {
    success: result?.success ?? false,
    wagerId: result?.wager_id ?? undefined,
    error: result?.error ?? undefined,
  }
}
