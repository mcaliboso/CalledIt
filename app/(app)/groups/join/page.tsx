'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

function JoinGroupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.toUpperCase() }),
      })

      const json = await res.json()

      if (!json.success) {
        setError(json.error ?? 'Failed to join group')
        return
      }

      router.push(`/groups/${json.data.group_id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enter Invite Code</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">6-Character Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ABC123"
              required
              maxLength={6}
              className="font-mono text-center text-xl tracking-widest"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading || code.length !== 6} className="w-full">
            {loading ? 'Joining...' : 'Join Group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function JoinGroupPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Join Group</h1>
      </div>

      <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-lg" />}>
        <JoinGroupForm />
      </Suspense>
    </div>
  )
}
