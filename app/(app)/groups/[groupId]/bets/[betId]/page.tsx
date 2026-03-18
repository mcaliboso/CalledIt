import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { getBetById } from '@/lib/repositories/bets'
import { getCurrentPoints } from '@/lib/services/points.service'
import { WagerForm } from '@/components/bets/wager-form'
import { SettlementPanel } from '@/components/bets/settlement-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Lock, CheckCircle2, Trophy } from 'lucide-react'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ groupId: string; betId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { betId } = await params
  const bet = await getBetById(betId)
  return { title: bet?.title ?? 'Bet' }
}

const OUTCOME_COLORS = {
  won: 'text-green-600 dark:text-green-400',
  lost: 'text-destructive',
  push: 'text-yellow-600 dark:text-yellow-400',
  pending: 'text-muted-foreground',
}

export default async function BetDetailPage({ params }: Props) {
  const { groupId, betId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bet = await getBetById(betId)
  if (!bet || bet.group_id !== groupId) notFound()

  const [membership, userPoints] = await Promise.all([
    supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()
      .then((r) => r.data),
    getCurrentPoints(user.id, groupId),
  ])

  if (!membership) redirect('/dashboard')

  const userWager = bet.wagers?.find((w) => w.user_id === user.id)
  const isCreator = bet.created_by === user.id
  const isAdmin = (membership as { role: string }).role === 'admin'
  const canSettle = (isCreator || isAdmin) && (bet.status === 'open' || bet.status === 'locked')
  const canWager = bet.status === 'open' && !userWager

  const totalPot = bet.wagers?.reduce((sum, w) => sum + w.points_wagered, 0) ?? 0
  const config = bet.config as Record<string, unknown>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight">{bet.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={bet.status === 'open' ? 'default' : 'secondary'} className="text-xs">
              {bet.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {bet.bet_type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {bet.description && (
        <p className="text-sm text-muted-foreground">{bet.description}</p>
      )}

      {/* Bet info */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Pot</p>
          <p className="font-bold">{totalPot.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Wagers</p>
          <p className="font-bold">{bet.wagers?.length ?? 0}</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Your Pts</p>
          <p className="font-bold">{userPoints.toLocaleString()}</p>
        </div>
      </div>

      {bet.closes_at && (
        <p className="text-xs text-muted-foreground">
          {bet.status === 'open' ? 'Closes' : 'Closed'} {formatDistanceToNow(new Date(bet.closes_at), { addSuffix: true })}
        </p>
      )}

      {/* Settlement result */}
      {bet.status === 'settled' && bet.correct_answer && (
        <Card className="border-green-500/50 bg-green-50/5">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Settled: <span className="text-green-600 dark:text-green-400">{bet.correct_answer}</span></p>
              {bet.settled_at && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(bet.settled_at), 'PPp')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User's wager */}
      {userWager && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Wager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{userWager.prediction}</p>
                <p className="text-sm text-muted-foreground">
                  {userWager.points_wagered.toLocaleString()} pts wagered
                </p>
              </div>
              {userWager.outcome !== 'pending' && (
                <div className="text-right">
                  <p className={`font-bold ${OUTCOME_COLORS[userWager.outcome]}`}>
                    {userWager.outcome.toUpperCase()}
                  </p>
                  {userWager.points_delta !== null && (
                    <p className="text-sm text-muted-foreground">
                      {userWager.points_delta > 0 ? '+' : ''}{userWager.points_delta.toLocaleString()} pts
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wager form */}
      {canWager && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Place Your Wager</CardTitle>
          </CardHeader>
          <CardContent>
            <WagerForm bet={bet} userPoints={userPoints} />
          </CardContent>
        </Card>
      )}

      {/* Settlement panel */}
      {canSettle && <SettlementPanel bet={bet} />}

      {/* All wagers */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          All Wagers ({bet.wagers?.length ?? 0})
        </h2>
        <div className="space-y-2">
          {(bet.wagers ?? []).map((wager) => {
            const profile = wager.user as { username: string; display_name: string | null; avatar_url: string | null } | null
            return (
              <div key={wager.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(profile?.display_name ?? profile?.username ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {profile?.display_name ?? profile?.username ?? 'Unknown'}
                    {wager.user_id === user.id && <span className="text-muted-foreground ml-1 text-xs">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {wager.prediction} · {wager.points_wagered.toLocaleString()} pts
                  </p>
                </div>
                {wager.outcome !== 'pending' && (
                  <span className={`text-xs font-bold ${OUTCOME_COLORS[wager.outcome]}`}>
                    {wager.outcome.toUpperCase()}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
