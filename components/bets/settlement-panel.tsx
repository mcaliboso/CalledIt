'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { settleBetSchema, type SettleBetInput } from '@/lib/validators/bet'
import type { BetWithWagers } from '@/lib/types/bet.types'
import type { CustomConfig, OverUnderConfig } from '@/lib/types/bet.types'

interface SettlementPanelProps {
  bet: BetWithWagers
}

export function SettlementPanel({ bet }: SettlementPanelProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState('')

  const config = bet.config as Record<string, unknown>

  async function handleSettle() {
    if (!correctAnswer) {
      setError('Please provide the correct answer')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/bets/${bet.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct_answer: correctAnswer }),
      })

      const json = await res.json()

      if (!json.success) {
        setError(json.error ?? 'Failed to settle bet')
        return
      }

      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderAnswerInput = () => {
    if (bet.bet_type === 'over_under') {
      const ouConfig = config as unknown as OverUnderConfig
      return (
        <div className="space-y-2">
          <Label>Actual Value ({ouConfig.unit})</Label>
          <Input
            type="number"
            value={correctAnswer}
            onChange={(e) => setCorrectAnswer(e.target.value)}
            placeholder={`e.g. ${ouConfig.line}`}
          />
          <p className="text-xs text-muted-foreground">
            Line was {ouConfig.line}. Enter the actual value.
          </p>
        </div>
      )
    }

    if (bet.bet_type === 'custom') {
      const customConfig = config as unknown as CustomConfig
      return (
        <div className="space-y-2">
          <Label>Correct Answer</Label>
          <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
            <SelectTrigger>
              <SelectValue placeholder="Select the correct answer" />
            </SelectTrigger>
            <SelectContent>
              {customConfig.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    if (bet.bet_type === 'moneyline' && bet.sports_event) {
      return (
        <div className="space-y-2">
          <Label>Winning Team</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={correctAnswer === bet.sports_event.home_team ? 'default' : 'outline'}
              onClick={() => setCorrectAnswer(bet.sports_event!.home_team)}
              className="flex-1"
            >
              {bet.sports_event.home_team}
            </Button>
            <Button
              type="button"
              variant={correctAnswer === bet.sports_event.away_team ? 'default' : 'outline'}
              onClick={() => setCorrectAnswer(bet.sports_event!.away_team)}
              className="flex-1"
            >
              {bet.sports_event.away_team}
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <Label>Correct Answer</Label>
        <Input
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          placeholder="Enter the correct answer..."
        />
      </div>
    )
  }

  return (
    <Card className="border-amber-500/50 bg-amber-50/5">
      <CardHeader>
        <CardTitle className="text-base text-amber-600 dark:text-amber-400">
          Settle This Bet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderAnswerInput()}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSettle}
          disabled={submitting || !correctAnswer}
          className="w-full"
          variant="default"
        >
          {submitting ? 'Settling...' : 'Confirm Settlement'}
        </Button>
      </CardContent>
    </Card>
  )
}
