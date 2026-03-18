import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { LeaderboardEntry } from '@/lib/types/bet.types'

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No members yet.</p>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-3 p-3 rounded-lg ${
            entry.user_id === currentUserId ? 'bg-accent' : 'hover:bg-accent/50'
          }`}
        >
          <span className="w-6 text-center text-sm font-bold text-muted-foreground">
            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
          </span>

          <Avatar className="h-8 w-8">
            <AvatarImage src={entry.avatar_url ?? undefined} />
            <AvatarFallback>
              {(entry.display_name ?? entry.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {entry.display_name ?? entry.username}
              {entry.user_id === currentUserId && (
                <span className="text-xs text-muted-foreground ml-1">(you)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.wagers_won}/{entry.wagers_total} bets won
            </p>
          </div>

          <Badge variant="secondary" className="font-mono">
            {entry.points.toLocaleString()} pts
          </Badge>
        </div>
      ))}
    </div>
  )
}
