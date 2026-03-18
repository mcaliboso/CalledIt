import { z } from 'zod'

const overUnderConfigSchema = z.object({
  line: z.number(),
  unit: z.string().min(1),
})

const closestGuessConfigSchema = z.object({
  tie_break: z.enum(['split_pot', 'first_guess_wins', 'push']),
  unit: z.string().min(1),
})

const spreadConfigSchema = z.object({
  favorite_team: z.string().min(1),
  spread: z.number(),
})

const moneylineConfigSchema = z.object({
  home_odds: z.number(),
  away_odds: z.number(),
})

const customConfigSchema = z.object({
  options: z.array(z.string().min(1)).min(2, 'Custom bet needs at least 2 options'),
})

export const createBetSchema = z.discriminatedUnion('bet_type', [
  z.object({
    bet_type: z.literal('over_under'),
    group_id: z.string().uuid(),
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    description: z.string().max(500).optional(),
    closes_at: z.string().datetime().optional(),
    sports_event_id: z.string().uuid().optional(),
    config: overUnderConfigSchema,
  }),
  z.object({
    bet_type: z.literal('closest_guess'),
    group_id: z.string().uuid(),
    title: z.string().min(3).max(150),
    description: z.string().max(500).optional(),
    closes_at: z.string().datetime().optional(),
    sports_event_id: z.string().uuid().optional(),
    config: closestGuessConfigSchema,
  }),
  z.object({
    bet_type: z.literal('spread'),
    group_id: z.string().uuid(),
    title: z.string().min(3).max(150),
    description: z.string().max(500).optional(),
    closes_at: z.string().datetime().optional(),
    sports_event_id: z.string().uuid().optional(),
    config: spreadConfigSchema,
  }),
  z.object({
    bet_type: z.literal('moneyline'),
    group_id: z.string().uuid(),
    title: z.string().min(3).max(150),
    description: z.string().max(500).optional(),
    closes_at: z.string().datetime().optional(),
    sports_event_id: z.string().uuid().optional(),
    config: moneylineConfigSchema,
  }),
  z.object({
    bet_type: z.literal('custom'),
    group_id: z.string().uuid(),
    title: z.string().min(3).max(150),
    description: z.string().max(500).optional(),
    closes_at: z.string().datetime().optional(),
    sports_event_id: z.string().uuid().optional(),
    config: customConfigSchema,
  }),
])

export const settleBetSchema = z.object({
  correct_answer: z.string().min(1, 'Correct answer is required'),
})

export type CreateBetInput = z.infer<typeof createBetSchema>
export type SettleBetInput = z.infer<typeof settleBetSchema>
