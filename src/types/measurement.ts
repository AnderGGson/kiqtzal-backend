export interface Measurement {
  id: number
  temp_abajo: number
  hum_abajo: number
  mq_abajo_raw: number
  temp_arriba: number
  hum_arriba: number
  mq_arriba_raw: number
  created_at: string
}

export type CreateMeasurementInput = Omit<Measurement, 'id' | 'created_at'>
