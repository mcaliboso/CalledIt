import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be at most 50 characters'),
  description: z.string().max(200, 'Description must be at most 200 characters').optional(),
})

export const joinGroupSchema = z.object({
  invite_code: z.string().length(6, 'Invite code must be 6 characters').toUpperCase(),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type JoinGroupInput = z.infer<typeof joinGroupSchema>
