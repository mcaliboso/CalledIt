import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserGroups } from '@/lib/repositories/groups'
import { GroupCard } from '@/components/groups/group-card'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const groups = await getUserGroups(user.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Groups</h1>
          <p className="text-sm text-muted-foreground">
            Bet with your friends in group channels
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/groups/join">Join</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/groups/new">
              <Plus className="h-4 w-4 mr-1" />
              New Group
            </Link>
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Users className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">No groups yet</p>
            <p className="text-sm text-muted-foreground">
              Create a group or join one with an invite code
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/groups/join">Join with Code</Link>
            </Button>
            <Button asChild>
              <Link href="/groups/new">Create Group</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}
