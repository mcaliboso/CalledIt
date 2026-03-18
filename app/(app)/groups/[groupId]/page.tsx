import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getGroupById } from '@/lib/repositories/groups'
import { getBetsByGroup } from '@/lib/repositories/bets'
import { BetCard } from '@/components/bets/bet-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Plus, Trophy } from 'lucide-react'
import { InviteLink } from '@/components/groups/invite-link'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { groupId } = await params
  const group = await getGroupById(groupId)
  return { title: group?.name ?? 'Group' }
}

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [group, bets] = await Promise.all([
    getGroupById(groupId),
    getBetsByGroup(groupId),
  ])

  if (!group) notFound()

  // Verify membership (RLS handles data, but we need to know role)
  const { data: membership } = await supabase
    .from('group_members')
    .select('role, points')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  const openBets = bets.filter((b) => b.status === 'open' || b.status === 'locked')
  const settledBets = bets.filter((b) => b.status === 'settled' || b.status === 'cancelled')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{group.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Your points: <span className="font-bold text-foreground">{(membership as { role: string; points: number }).points.toLocaleString()}</span>
          </p>
        </div>
        <Button asChild variant="ghost" size="icon">
          <Link href={`/groups/${groupId}/leaderboard`}>
            <Trophy className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/groups/${groupId}/bets/new`}>
            <Plus className="h-4 w-4 mr-1" />
            New Bet
          </Link>
        </Button>
      </div>

      <InviteLink inviteCode={group.invite_code} />

      <Tabs defaultValue="open">
        <TabsList className="w-full">
          <TabsTrigger value="open" className="flex-1">
            Open ({openBets.length})
          </TabsTrigger>
          <TabsTrigger value="settled" className="flex-1">
            Settled ({settledBets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-3 mt-4">
          {openBets.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground">No open bets yet</p>
              <Button asChild size="sm">
                <Link href={`/groups/${groupId}/bets/new`}>Create First Bet</Link>
              </Button>
            </div>
          ) : (
            openBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} groupId={groupId} />
            ))
          )}
        </TabsContent>

        <TabsContent value="settled" className="space-y-3 mt-4">
          {settledBets.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No settled bets yet</p>
          ) : (
            settledBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} groupId={groupId} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
