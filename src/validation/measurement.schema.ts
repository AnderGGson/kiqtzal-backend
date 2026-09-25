import { z } from 'zod'

const channelSchema = z.object({
  gas: z.number().finite(),
  humidity: z.number().finite(),
  temperature: z.number().finite().nullable().optional(),
})

export const measurementSchema = z.object({
  timestamp: z.string().datetime().optional(),
  experimentId: z.string().uuid().nullable().optional(),
  dirtyAir: channelSchema,
  cleanAir: channelSchema,
})

export type MeasurementInput = z.infer<typeof measurementSchema>