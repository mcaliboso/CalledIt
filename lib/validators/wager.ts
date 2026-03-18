import { z } from 'zod'

export const placeWagerSchema = z.object({
  points_wagered: z.number().int().min(1, 'Must wager at least 1 point').max(10000, 'Cannot wager more than 10,000 points'),
  prediction: z.string().min(1, 'Prediction is required'),
})

export type PlaceWagerInput = z.infer<typeof placeWagerSchema>
