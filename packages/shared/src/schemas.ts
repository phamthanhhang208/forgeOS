import { z } from 'zod'

export const CreateProjectSchema = z.object({
  concept: z.string().min(10, 'Concept must be at least 10 characters').max(5000),
  agencyId: z.string().min(1),
  mode: z.enum(['NEW', 'ITERATE']).default('NEW'),
  demoMode: z.boolean().optional(),
})

export const ApproveNodeSchema = z.object({
  editedPayload: z.record(z.unknown()).optional(),
  demoMode: z.boolean().optional(),
})

export const RejectNodeSchema = z.object({
  feedback: z.string().min(5, 'Feedback must be at least 5 characters').max(1000),
  demoMode: z.boolean().optional(),
})

export const ClarifyConceptSchema = z.object({
  concept: z.string().min(10, 'Concept must be at least 10 characters').max(5000),
  agencyId: z.string().min(1),
  demoMode: z.boolean().optional(),
})

export interface ClarifyQuestion {
  id: string
  question: string
  type: 'text' | 'select' | 'multiselect'
  options?: string[]
  placeholder?: string
}

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type ApproveNodeInput = z.infer<typeof ApproveNodeSchema>
export type RejectNodeInput = z.infer<typeof RejectNodeSchema>
export type ClarifyConceptInput = z.infer<typeof ClarifyConceptSchema>
