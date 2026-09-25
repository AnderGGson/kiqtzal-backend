import env from '../config/env.js'
import { createMemoryExperimentsRepository } from './memory/experiments.repository.js'
import { createMemoryMeasurementsRepository } from './memory/measurements.repository.js'
import { createPostgresExperimentsRepository } from './postgres/experiments.repository.js'
import { createPostgresMeasurementsRepository } from './postgres/measurements.repository.js'
import { initializeSchema } from './postgres/pool.js'
import type { ExperimentsRepository, MeasurementsRepository } from './types.js'

export type { CreateExperimentInput, CreateMeasurementInput, MeasurementFilters } from './types.js'

export interface Database {
  experiments: ExperimentsRepository
  measurements: MeasurementsRepository
}

export const database: Database = createDatabase()

export async function initializeDatabase(): Promise<void> {
  if (env.databaseDriver === 'postgres') {
    await initializeSchema()
  }
}

function createDatabase(): Database {
  if (env.databaseDriver === 'postgres') {
    return {
      experiments: createPostgresExperimentsRepository(),
      measurements: createPostgresMeasurementsRepository(),
    }
  }
  return {
    experiments: createMemoryExperimentsRepository(),
    measurements: createMemoryMeasurementsRepository(),
  }
}