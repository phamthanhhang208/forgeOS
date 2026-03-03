import { z } from 'zod'

export const CreateProjectSchema = z.object({
  concept: z.string().min(10, 'Concept must be at least 10 characters').max(500),
  agencyId: z.string().cuid(),
  mode: z.enum(['NEW', 'ITERATE']).default('NEW'),
})

export const ApproveNodeSchema = z.object({
  editedPayload: z.record(z.unknown()).optional(),
})

export const RejectNodeSchema = z.object({
  feedback: z.string().min(5, 'Feedback must be at least 5 characters').max(1000),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type ApproveNodeInput = z.infer<typeof ApproveNodeSchema>
export type RejectNodeInput = z.infer<typeof RejectNodeSchema>
