import type { Experiment, Measurement, SensorReading } from '../types/index.js'

export interface CreateMeasurementInput {
  experimentId: string | null
  timestamp: string
  dirtyAir: SensorReading
  cleanAir: SensorReading
}

export interface MeasurementFilters {
  from?: string
  to?: string
  after?: string
  limit?: number
  offset?: number
}

export interface CreateExperimentInput {
  name: string
  description?: string | null
  mode: Experiment['mode']
  startedAt: string
}

export interface ListParams {
  limit?: number
  offset?: number
}

export interface MeasurementsRepository {
  create(input: CreateMeasurementInput): Promise<Measurement>
  getLatest(): Promise<Measurement | null>
  list(filters?: MeasurementFilters): Promise<Measurement[]>
  listByExperiment(experimentId: string, filters?: MeasurementFilters): Promise<Measurement[]>
}

export interface ExperimentsRepository {
  list(params?: ListParams): Promise<Experiment[]>
  findById(id: string): Promise<Experiment | null>
  create(input: CreateExperimentInput): Promise<Experiment>
}