import { database } from '../repositories/db.js'
import type { MeasurementFilters } from '../repositories/types.js'
import { measurementSchema } from '../validation/measurement.schema.js'
import type { Measurement } from '../types/index.js'

export type IngestMeasurementInput = unknown

export function parseMeasurementInput(input: IngestMeasurementInput) {
  const parsed = measurementSchema.parse(input)
  return {
    experimentId: parsed.experimentId ?? null,
    timestamp: parsed.timestamp ?? new Date().toISOString(),
    dirtyAir: {
      gas: parsed.dirtyAir.gas,
      humidity: parsed.dirtyAir.humidity,
      temperature: parsed.dirtyAir.temperature ?? null,
    },
    cleanAir: {
      gas: parsed.cleanAir.gas,
      humidity: parsed.cleanAir.humidity,
      temperature: parsed.cleanAir.temperature ?? null,
    },
  }
}

export async function ingestMeasurement(input: IngestMeasurementInput): Promise<Measurement> {
  const valid = parseMeasurementInput(input)
  return database.measurements.create(valid)
}

export async function getLatestMeasurement(): Promise<Measurement | null> {
  return database.measurements.getLatest()
}

export async function listMeasurements(filters: MeasurementFilters = {}): Promise<Measurement[]> {
  return database.measurements.list(filters)
}