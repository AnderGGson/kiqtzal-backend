export interface Measurement {
  id: string
  experimentId: string | null
  timestamp: string
  gas: number
  humidity: number
  temperature: number | null
}