import { randomUUID } from 'node:crypto'
import type { QueryResultRow } from 'pg'
import type { Experiment } from '../../types/index.js'
import type { CreateExperimentInput, ExperimentsRepository, ListParams } from '../types.js'
import { getPool } from './pool.js'

interface ExperimentRow extends QueryResultRow {
  id: string
  name: string
  description: string | null
  mode: string
  started_at: Date
  ended_at: Date | null
  created_at: Date
  updated_at: Date
}

const COLUMNS = 'id, name, description, mode, started_at, ended_at, created_at, updated_at'

type ExperimentMode = Experiment['mode']

function mapRow(row: ExperimentRow): Experiment {
  const mode = row.mode as ExperimentMode
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mode,
    startedAt: new Date(row.started_at).toISOString(),
    endedAt: row.ended_at ? new Date(row.ended_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export function createPostgresExperimentsRepository(): ExperimentsRepository {
  const pool = getPool()

  return {
    async list(params: ListParams = {}): Promise<Experiment[]> {
      const limit = params.limit ?? 100
      const offset = params.offset ?? 0
      const { rows } = await pool.query<ExperimentRow>(
        `SELECT ${COLUMNS} FROM experiments ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset],
      )
      return rows.map(mapRow)
    },

    async findById(id: string): Promise<Experiment | null> {
      const { rows } = await pool.query<ExperimentRow>(
        `SELECT ${COLUMNS} FROM experiments WHERE id = $1`,
        [id],
      )
      return rows[0] ? mapRow(rows[0]) : null
    },

    async create(input: CreateExperimentInput): Promise<Experiment> {
      const now = new Date()
      const { rows } = await pool.query<ExperimentRow>(
        `INSERT INTO experiments (id, name, description, mode, started_at, ended_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NULL, $6, $6)
         RETURNING ${COLUMNS}`,
        [
          randomUUID(),
          input.name,
          input.description ?? null,
          input.mode,
          input.startedAt,
          now,
        ],
      )
      return mapRow(rows[0]!)
    },
  }
}