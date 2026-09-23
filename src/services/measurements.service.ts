import { database } from '../repositories/db.js'
import { measurementSchema } from '../validation/measurement.schema.js'
import type { Measurement } from '../types/index.js'

export type IngestMeasurementInput = unknown

export function parseMeasurementInput(input: IngestMeasurementInput) {
  const parsed = measurementSchema.parse(input)
  return {
    experimentId: parsed.experimentId ?? null,
    timestamp: parsed.timestamp,
    gas: parsed.gas,
    humidity: parsed.humidity,
    temperature: parsed.temperature ?? null,
  }
}

export function ingestMeasurement(input: IngestMeasurementInput): Measurement {
  const valid = parseMeasurementInput(input)
  return database.measurements.create(valid)
}

export function getLatestMeasurement(): Measurement | null {
  return database.measurements.getLatest()
}