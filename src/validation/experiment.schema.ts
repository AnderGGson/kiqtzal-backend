import { z } from 'zod'

export const experimentSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  mode: z.enum(['with-biopurifier', 'without-biopurifier']),
  startedAt: z.string().datetime(),
})

export type ExperimentInput = z.infer<typeof experimentSchema>