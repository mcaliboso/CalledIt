import { createClient } from '@/lib/supabase/server'
import type { Group, GroupWithMembers, LeaderboardEntry } from '@/lib/types/bet.types'

export async function getUserGroups(userId: string): Promise<GroupWithMembers[]> {
  const supabase = await createClient()

  // Get group_ids for this user
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  if (memberError) throw memberError
  if (!memberships || memberships.length === 0) return []

  const groupIds = memberships.map((m) => m.group_id)

  // Get groups
  const { data: groups, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)

  if (groupError) throw groupError
  if (!groups) return []

  // Get member counts
  const { data: memberCounts } = await supabase
    .from('group_members')
    .select('group_id')
    .in('group_id', groupIds)

  const countMap = (memberCounts || []).reduce<Record<string, number>>((acc, m) => {
    acc[m.group_id] = (acc[m.group_id] || 0) + 1
    return acc
  }, {})

  return groups.map((g) => ({ ...g, member_count: countMap[g.id] || 0 }))
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (error) return null
  return data
}

export async function getGroupLeaderboard(groupId: string): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from('group_members')
    .select('user_id, points')
    .eq('group_id', groupId)
    .order('points', { ascending: false })

  if (error) throw error
  if (!members) return []

  const userIds = members.map((m) => m.user_id)

  // Get profiles separately
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = (profiles || []).reduce<Record<string, { username: string; display_name: string | null; avatar_url: string | null }>>((acc, p) => {
    acc[p.id] = { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }
    return acc
  }, {})

  // Get wager stats
  const { data: wagerStats } = await supabase
    .from('wagers')
    .select('user_id, outcome')
    .eq('group_id', groupId)
    .in('user_id', userIds)

  const statsMap = (wagerStats || []).reduce<Record<string, { won: number; total: number }>>((acc, w) => {
    if (!acc[w.user_id]) acc[w.user_id] = { won: 0, total: 0 }
    acc[w.user_id].total++
    if (w.outcome === 'won') acc[w.user_id].won++
    return acc
  }, {})

  return members.map((m, idx) => {
    const profile = profileMap[m.user_id]
    const stats = statsMap[m.user_id] || { won: 0, total: 0 }
    return {
      user_id: m.user_id,
      username: profile?.username ?? 'Unknown',
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      points: m.points,
      rank: idx + 1,
      wagers_won: stats.won,
      wagers_total: stats.total,
    }
  })
}

export async function getGroupMembers(groupId: string) {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('points', { ascending: false })

  if (error) throw error
  if (!members) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', userIds)

  const profileMap = (profiles || []).reduce<Record<string, unknown>>((acc, p) => {
    acc[p.id] = p
    return acc
  }, {})

  return members.map((m) => ({ ...m, profiles: profileMap[m.user_id] ?? null }))
}
