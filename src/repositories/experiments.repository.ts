import { randomUUID } from 'node:crypto'
import type { Experiment, ExperimentMode } from '../types/index.js'

interface CreateExperimentInput {
  name: string
  description?: string | null
  mode: ExperimentMode
  startedAt: string
}

const experiments: Experiment[] = []

export function createExperimentsRepository() {
  return {
    list(params: { limit?: number; offset?: number } = {}): Experiment[] {
      const offset = params.offset ?? 0
      const limit = params.limit
      return limit === undefined
        ? experiments.slice(offset)
        : experiments.slice(offset, offset + limit)
    },

    findById(id: string): Experiment | null {
      return experiments.find((experiment) => experiment.id === id) ?? null
    },

    create(input: CreateExperimentInput): Experiment {
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