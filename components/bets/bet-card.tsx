'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Lock, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BetWithWagers } from '@/lib/types/bet.types'

interface BetCardProps {
  bet: BetWithWagers
  groupId: string
}

const STATUS_ICONS = {
  open: <Clock className="h-3 w-3" />,
  locked: <Lock className="h-3 w-3" />,
  settled: <CheckCircle2 className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  locked: 'secondary',
  settled: 'outline',
  cancelled: 'destructive',
}

const BET_TYPE_LABELS: Record<string, string> = {
  over_under: 'Over/Under',
  closest_guess: 'Closest Guess',
  spread: 'Spread',
  moneyline: 'Moneyline',
  custom: 'Custom',
}

export function BetCard({ bet, groupId }: BetCardProps) {
  const wagerCount = bet.wagers?.length ?? 0
  const totalPot = bet.wagers?.reduce((sum, w) => sum + w.points_wagered, 0) ?? 0

  return (
    <Link href={`/groups/${groupId}/bets/${bet.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2 flex-1">{bet.title}</CardTitle>
            <Badge variant={STATUS_COLORS[bet.status]} className="flex items-center gap-1 shrink-0">
              {STATUS_ICONS[bet.status]}
              {bet.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {BET_TYPE_LABELS[bet.bet_type] ?? bet.bet_type}
              </Badge>
              <span>{wagerCount} wager{wagerCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono">{totalPot.toLocaleString()} pts pot</span>
            </div>
          </div>

          {bet.closes_at && bet.status === 'open' && (
            <p className="text-xs text-muted-foreground mt-2">
              Closes {formatDistanceToNow(new Date(bet.closes_at), { addSuffix: true })}
            </p>
          )}

          {bet.status === 'settled' && bet.correct_answer && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
              Answer: {bet.correct_answer}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
