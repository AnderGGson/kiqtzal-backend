import { randomUUID } from 'node:crypto'
import type { Experiment } from '../../types/index.js'
import type { CreateExperimentInput, ExperimentsRepository, ListParams } from '../types.js'

const experiments: Experiment[] = []

export function createMemoryExperimentsRepository(): ExperimentsRepository {
  return {
    async list(params: ListParams = {}): Promise<Experiment[]> {
      const offset = params.offset ?? 0
      const limit = params.limit
      return limit === undefined
        ? experiments.slice(offset)
        : experiments.slice(offset, offset + limit)
    },

    async findById(id: string): Promise<Experiment | null> {
      return experiments.find((experiment) => experiment.id === id) ?? null
    },

    async create(input: CreateExperimentInput): Promise<Experiment> {
      const now = new Date().toISOString()
      const experiment: Experiment = {
        id: randomUUID(),
        name: input.name,
        description: input.description ?? null,
        mode: input.mode,
        startedAt: input.startedAt,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      }
      experiments.push(experiment)
      return experiment
    },
  }
}