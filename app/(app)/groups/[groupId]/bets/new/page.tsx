import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BetForm } from '@/components/bets/bet-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Bet' }

interface Props {
  params: Promise<{ groupId: string }>
}

export default async function NewBetPage({ params }: Props) {
  const { groupId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify membership
  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/groups/${groupId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">New Bet</h1>
      </div>

      <BetForm groupId={groupId} />
    </div>
  )
}
