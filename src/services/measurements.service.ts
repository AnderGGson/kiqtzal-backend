import { database } from '../repositories/db.js'
import { measurementSchema } from '../validation/measurement.schema.js'
import { measurementsQuerySchema } from '../utils/query.js'
import type { Measurement } from '../types/index.js'

export function parseMeasurementInput(input: unknown) {
  return measurementSchema.parse(input)
}

export async function ingestMeasurement(input: unknown): Promise<Measurement> {
  const valid = parseMeasurementInput(input)
  return database.measurements.create(valid)
}

export async function getLatestMeasurement(): Promise<Measurement | null> {
  return database.measurements.getLatest()
}

export async function listMeasurements(input: unknown): Promise<Measurement[]> {
  const filters = measurementsQuerySchema.parse(input)
  return database.measurements.list(filters)
}

export async function checkDatabaseConnection(): Promise<void> {
  await database.ping()
}
