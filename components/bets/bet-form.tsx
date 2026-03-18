'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

interface BetFormProps {
  groupId: string
}

type BetType = 'over_under' | 'custom' | 'closest_guess' | 'moneyline'

export function BetForm({ groupId }: BetFormProps) {
  const router = useRouter()
  const [betType, setBetType] = useState<BetType>('custom')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closesAt, setClosesAt] = useState('')

  // Over/Under config
  const [line, setLine] = useState('')
  const [unit, setUnit] = useState('')

  // Closest Guess config
  const [cgUnit, setCgUnit] = useState('')
  const [tieBreak, setTieBreak] = useState<'split_pot' | 'first_guess_wins' | 'push'>('split_pot')

  // Custom config
  const [options, setOptions] = useState(['', ''])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    let config: Record<string, unknown> = {}

    if (betType === 'over_under') {
      if (!line || !unit) {
        setError('Line and unit are required for Over/Under bets')
        setSubmitting(false)
        return
      }
      config = { line: parseFloat(line), unit }
    } else if (betType === 'closest_guess') {
      if (!cgUnit) {
        setError('Unit is required for Closest Guess bets')
        setSubmitting(false)
        return
      }
      config = { unit: cgUnit, tie_break: tieBreak }
    } else if (betType === 'custom') {
      const cleanOptions = options.filter((o) => o.trim().length > 0)
      if (cleanOptions.length < 2) {
        setError('Custom bets need at least 2 options')
        setSubmitting(false)
        return
      }
      config = { options: cleanOptions }
    }

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          title,
          description: description || undefined,
          bet_type: betType,
          config,
          closes_at: closesAt ? new Date(closesAt).toISOString() : undefined,
        }),
      })

      const json = await res.json()

      if (!json.success) {
        setError(json.error ?? 'Failed to create bet')
        return
      }

      router.push(`/groups/${groupId}`)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Bet Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. How many points will LeBron score?"
          required
          maxLength={150}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any additional details..."
          maxLength={500}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Bet Type *</Label>
        <Select value={betType} onValueChange={(v) => setBetType(v as BetType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom — Pick an option</SelectItem>
            <SelectItem value="over_under">Over/Under — Beat a line</SelectItem>
            <SelectItem value="closest_guess">Closest Guess — Guess a number</SelectItem>
            <SelectItem value="moneyline">Moneyline — Pick a winner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Type-specific config */}
      {betType === 'over_under' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Line *</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  placeholder="e.g. 25.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. points, goals"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {betType === 'closest_guess' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Input
                value={cgUnit}
                onChange={(e) => setCgUnit(e.target.value)}
                placeholder="e.g. points, yards"
              />
            </div>
            <div className="space-y-2">
              <Label>Tie-break Rule</Label>
              <Select value={tieBreak} onValueChange={(v) => setTieBreak(v as typeof tieBreak)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split_pot">Split the pot</SelectItem>
                  <SelectItem value="first_guess_wins">First guess wins</SelectItem>
                  <SelectItem value="push">Push (return wagers)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {betType === 'custom' && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Label>Options (min 2) *</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const updated = [...options]
                    updated[i] = e.target.value
                    setOptions(updated)
                  }}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOptions([...options, ''])}
            >
              + Add Option
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="closes_at">Closes At (optional)</Label>
        <Input
          id="closes_at"
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          No more wagers after this time. Leave blank to close manually.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting || !title} className="w-full">
        {submitting ? 'Creating Bet...' : 'Create Bet'}
      </Button>
    </form>
  )
}
