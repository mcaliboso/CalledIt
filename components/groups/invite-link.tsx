'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InviteLinkProps {
  inviteCode: string
}

export function InviteLink({ inviteCode }: InviteLinkProps) {
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/join?code=${inviteCode}`

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <Label>Invite Link</Label>
      <div className="flex gap-2">
        <Input value={inviteUrl} readOnly className="font-mono text-sm" />
        <Button variant="outline" size="icon" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Invite code: <span className="font-mono font-semibold">{inviteCode}</span>
      </p>
    </div>
  )
}
