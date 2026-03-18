import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGroupById, getGroupLeaderboard } from '@/lib/repositories/groups'
import { LeaderboardTable } from '@/components/groups/leaderboard-table'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params
  const group = await getGroupById(groupId)
  return { title: `Leaderboard — ${group?.name ?? 'Group'}` }
}

export default async function LeaderboardPage({ params }: Props) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [group, leaderboard] = await Promise.all([
    getGroupById(groupId),
    getGroupLeaderboard(groupId),
  ])

  if (!group) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">{group.name}</p>
        </div>
      </div>

      <LeaderboardTable entries={leaderboard} currentUserId={user.id} />
    </div>
  )
}
