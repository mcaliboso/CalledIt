'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { GroupWithMembers } from '@/lib/types/bet.types'

interface GroupCardProps {
  group: GroupWithMembers
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg line-clamp-1">{group.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{group.member_count ?? 0} member{group.member_count !== 1 ? 's' : ''}</span>
            <Badge variant="outline" className="ml-auto font-mono text-xs">
              {group.invite_code}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
