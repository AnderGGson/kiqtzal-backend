import { randomUUID } from 'node:crypto'
import type { Measurement } from '../types/index.js'

interface CreateMeasurementInput {
  experimentId: string | null
  timestamp: string
  gas: number
  humidity: number
  temperature: number | null
}

interface ListByExperimentFilters {
  from?: string
  to?: string
  after?: string
  limit?: number
  offset?: number
}

const measurements: Measurement[] = []

export function createMeasurementsRepository() {
  return {
    create(input: CreateMeasurementInput): Measurement {
      const measurement: Measurement = {
        id: randomUUID(),
        ...input,
      }
      measurements.push(measurement)
      return measurement
    },

    getLatest(): Measurement | null {
      const latest = measurements
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      return latest ?? null
    },

    listByExperiment(experimentId: string, filters: ListByExperimentFilters = {}): Measurement[] {
      let result = measurements.filter((measurement) => measurement.experimentId === experimentId)

      if (filters.from) result = result.filter((measurement) => measurement.timestamp >= filters.from!)
      if (filters.to) result = result.filter((measurement) => measurement.timestamp <= filters.to!)
      if (filters.after) result = result.filter((measurement) => measurement.timestamp > filters.after!)

      result.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

      const offset = filters.offset ?? 0
      const limit = filters.limit
      return limit === undefined
        ? result.slice(offset)
        : result.slice(offset, offset + limit)
    },
  }
}