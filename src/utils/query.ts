import { z } from 'zod'

const optionalDateTime = z.string().datetime({ offset: true }).optional()

export const measurementsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
    from: optionalDateTime,
    to: optionalDateTime,
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.from || !value.to) return
    if (new Date(value.from).getTime() > new Date(value.to).getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from debe ser anterior o igual a to',
        path: ['from'],
      })
    }
  })

export type MeasurementsQuery = z.infer<typeof measurementsQuerySchema>
