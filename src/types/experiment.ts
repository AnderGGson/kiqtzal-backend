export type ExperimentMode = 'with-biopurifier' | 'without-biopurifier'

export interface Experiment {
  id: string
  name: string
  description: string | null
  mode: ExperimentMode
  startedAt: string
  endedAt: string | null
  createdAt: string
  updatedAt: string
}