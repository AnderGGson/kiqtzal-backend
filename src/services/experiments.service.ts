import { database } from '../repositories/db.js'
import type { ListParams, MeasurementFilters } from '../repositories/types.js'
import type { Experiment, Measurement } from '../types/index.js'

export async function listExperiments(params: ListParams = {}): Promise<Experiment[]> {
  return database.experiments.list(params)
}

export async function getExperimentById(id: string): Promise<Experiment | null> {
  return database.experiments.findById(id)
}

export async function getMeasurementsByExperiment(
  id: string,
  params: MeasurementFilters = {},
): Promise<Measurement[] | null> {
  const experiment = await database.experiments.findById(id)
  if (!experiment) return null
  return database.measurements.listByExperiment(id, params)
}