import { createExperimentsRepository } from './experiments.repository.js'
import { createMeasurementsRepository } from './measurements.repository.js'

export interface Database {
  experiments: ReturnType<typeof createExperimentsRepository>
  measurements: ReturnType<typeof createMeasurementsRepository>
}

export const database: Database = {
  experiments: createExperimentsRepository(),
  measurements: createMeasurementsRepository(),
}