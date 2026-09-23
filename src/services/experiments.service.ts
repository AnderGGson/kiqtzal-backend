import { database } from '../repositories/db.js'
import type { Experiment, Measurement } from '../types/index.js'

interface ListExperimentsParams {
  limit?: number
  offset?: number
}

type ListMeasurementsParams = {
  from?: string
  to?: string
  after?: string
  limit?: number
  offset?: number
}

export function listExperiments(params: ListExperimentsParams = {}): Experiment[] {
  return database.experiments.list(params)
}

export function getExperimentById(id: string): Experiment | null {
  return database.experiments.findById(id)
}

export function getMeasurementsByExperiment(
  id: string,
  params: ListMeasurementsParams = {},
): Measurement[] | null {
  const experiment = database.experiments.findById(id)
  if (!experiment) return null
  return database.measurements.listByExperiment(id, params)
}