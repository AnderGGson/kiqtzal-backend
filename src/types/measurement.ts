export interface SensorReading {
  gas: number
  humidity: number
  temperature: number | null
}

export interface Measurement {
  id: string
  experimentId: string | null
  timestamp: string
  dirtyAir: SensorReading
  cleanAir: SensorReading
}