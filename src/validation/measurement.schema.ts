import { z } from 'zod'

const decimalMeasurement = z.number().finite().min(-999.99).max(999.99)
const rawMeasurement = z.number().int().min(-2_147_483_648).max(2_147_483_647)

export const measurementSchema = z
  .object({
    temp_abajo: decimalMeasurement,
    hum_abajo: decimalMeasurement,
    mq_abajo_raw: rawMeasurement,
    temp_arriba: decimalMeasurement,
    hum_arriba: decimalMeasurement,
    mq_arriba_raw: rawMeasurement,
  })
  .strict()

export type MeasurementInput = z.infer<typeof measurementSchema>
