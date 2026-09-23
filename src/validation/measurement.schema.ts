import { z } from 'zod'

export const measurementSchema = z.object({
  timestamp: z.string().datetime(),
  experimentId: z.string().uuid().nullable().optional(),
  gas: z.number().finite(),
  humidity: z.number().finite(),
  temperature: z.number().finite().nullable().optional(),
})

export type MeasurementInput = z.infer<typeof measurementSchema>