import { randomUUID } from 'node:crypto'
import type { Measurement } from '../../types/index.js'
import type {
  CreateMeasurementInput,
  MeasurementFilters,
  MeasurementsRepository,
} from '../types.js'

const measurements: Measurement[] = []

export function createMemoryMeasurementsRepository(): MeasurementsRepository {
  return {
    async create(input: CreateMeasurementInput): Promise<Measurement> {
      const measurement: Measurement = {
        id: randomUUID(),
        ...input,
      }
      measurements.push(measurement)
      return measurement
    },

    async getLatest(): Promise<Measurement | null> {
      const latest = measurements
        .slice()
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      return latest ?? null
    },

    async list(filters: MeasurementFilters = {}): Promise<Measurement[]> {
      return filterAndSlice(measurements, null, filters)
    },

    async listByExperiment(
      experimentId: string,
      filters: MeasurementFilters = {},
    ): Promise<Measurement[]> {
      return filterAndSlice(measurements, experimentId, filters)
    },
  }
}

function filterAndSlice(
  all: Measurement[],
  experimentId: string | null,
  filters: MeasurementFilters,
): Measurement[] {
  let result =
    experimentId === null
      ? all.slice()
      : all.filter((measurement) => measurement.experimentId === experimentId)

  if (filters.from) result = result.filter((measurement) => measurement.timestamp >= filters.from!)
  if (filters.to) result = result.filter((measurement) => measurement.timestamp <= filters.to!)
  if (filters.after) result = result.filter((measurement) => measurement.timestamp > filters.after!)

  result.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const offset = filters.offset ?? 0
  const limit = filters.limit
  return limit === undefined ? result.slice(offset) : result.slice(offset, offset + limit)
}