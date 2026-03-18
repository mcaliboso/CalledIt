'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { placeWagerSchema, type PlaceWagerInput } from '@/lib/validators/wager'
import type { BetWithWagers } from '@/lib/types/bet.types'
import type { CustomConfig, OverUnderConfig } from '@/lib/types/bet.types'

interface WagerFormProps {
  bet: BetWithWagers
  userPoints: number
  onSuccess?: () => void
}

export function WagerForm({ bet, userPoints, onSuccess }: WagerFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PlaceWagerInput>({
    resolver: zodResolver(placeWagerSchema),
    defaultValues: { points_wagered: 10 },
  })

  const pointsWagered = watch('points_wagered') || 0
  const config = bet.config as Record<string, unknown>

  async function onSubmit(data: PlaceWagerInput) {
    if (!prediction) {
      setError('Please select a prediction')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/bets/${bet.id}/wager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, prediction }),
      })

      const json = await res.json()

      if (!json.success) {
        setError(json.error ?? 'Failed to place wager')
        return
      }

      onSuccess?.()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderPredictionInput = () => {
    if (bet.bet_type === 'over_under') {
      const ouConfig = config as unknown as OverUnderConfig
      return (
        <div className="space-y-2">
          <Label>Your Prediction</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={prediction === 'over' ? 'default' : 'outline'}
              onClick={() => setPrediction('over')}
              className="flex-1"
            >
              Over {ouConfig.line} {ouConfig.unit}
            </Button>
            <Button
              type="button"
              variant={prediction === 'under' ? 'default' : 'outline'}
              onClick={() => setPrediction('under')}
              className="flex-1"
            >
              Under {ouConfig.line} {ouConfig.unit}
            </Button>
          </div>
        </div>
      )
    }

    if (bet.bet_type === 'custom') {
      const customConfig = config as unknown as CustomConfig
      return (
        <div className="space-y-2">
          <Label>Your Prediction</Label>
          <Select value={prediction} onValueChange={setPrediction}>
            <SelectTrigger>
              <SelectValue placeholder="Select your prediction" />
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
          <Label>Pick the Winner</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={prediction === bet.sports_event.home_team ? 'default' : 'outline'}
              onClick={() => setPrediction(bet.sports_event!.home_team)}
              className="flex-1"
            >
              {bet.sports_event.home_team}
            </Button>
            <Button
              type="button"
              variant={prediction === bet.sports_event.away_team ? 'default' : 'outline'}
              onClick={() => setPrediction(bet.sports_event!.away_team)}
              className="flex-1"
            >
              {bet.sports_event.away_team}
            </Button>
          </div>
        </div>
      )
    }

    // Default: text input
    return (
      <div className="space-y-2">
        <Label>Your Prediction</Label>
        <Input
          value={prediction}
          onChange={(e) => setPrediction(e.target.value)}
          placeholder="Enter your prediction..."
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {renderPredictionInput()}

      <div className="space-y-2">
        <Label htmlFor="points_wagered">
          Points to Wager
          <span className="text-muted-foreground ml-2 text-xs">
            (you have {userPoints.toLocaleString()} pts)
          </span>
        </Label>
        <Input
          id="points_wagered"
          type="number"
          min={1}
          max={userPoints}
          {...register('points_wagered', { valueAsNumber: true })}
        />
        {errors.points_wagered && (
          <p className="text-sm text-destructive">{errors.points_wagered.message}</p>
        )}
      </div>

      {pointsWagered > 0 && (
        <p className="text-sm text-muted-foreground">
          You'll wager <span className="font-semibold">{pointsWagered.toLocaleString()} pts</span>,
          leaving you with <span className="font-semibold">{(userPoints - pointsWagered).toLocaleString()} pts</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Placing Wager...' : 'Place Wager'}
      </Button>
    </form>
  )
}
