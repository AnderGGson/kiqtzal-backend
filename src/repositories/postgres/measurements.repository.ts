import { randomUUID } from 'node:crypto'
import type { QueryResultRow } from 'pg'
import type { Measurement } from '../../types/index.js'
import type {
  CreateMeasurementInput,
  MeasurementFilters,
  MeasurementsRepository,
} from '../types.js'
import { getPool } from './pool.js'

interface MeasurementRow extends QueryResultRow {
  id: string
  experiment_id: string | null
  timestamp: Date
  dirty_gas: number
  dirty_humidity: number
  dirty_temperature: number | null
  clean_gas: number
  clean_humidity: number
  clean_temperature: number | null
}

const COLUMNS = `
  id, experiment_id, timestamp,
  dirty_gas, dirty_humidity, dirty_temperature,
  clean_gas, clean_humidity, clean_temperature
`

function mapRow(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    timestamp: new Date(row.timestamp).toISOString(),
    dirtyAir: {
      gas: row.dirty_gas,
      humidity: row.dirty_humidity,
      temperature: row.dirty_temperature,
    },
    cleanAir: {
      gas: row.clean_gas,
      humidity: row.clean_humidity,
      temperature: row.clean_temperature,
    },
  }
}

function buildListQuery(
  experimentId: string | null,
  filters: MeasurementFilters,
): { text: string; values: unknown[] } {
  const conditions: string[] = []
  const values: unknown[] = []

  if (experimentId !== null) {
    values.push(experimentId)
    conditions.push(`experiment_id = $${values.length}`)
  }
  if (filters.from) {
    values.push(filters.from)
    conditions.push(`timestamp >= $${values.length}`)
  }
  if (filters.to) {
    values.push(filters.to)
    conditions.push(`timestamp <= $${values.length}`)
  }
  if (filters.after) {
    values.push(filters.after)
    conditions.push(`timestamp > $${values.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit ?? 500
  const offset = filters.offset ?? 0
  values.push(limit, offset)

  const text = `
    SELECT ${COLUMNS}
    FROM measurements
    ${where}
    ORDER BY timestamp DESC
    LIMIT $${values.length - 1} OFFSET $${values.length}
  `
  return { text, values }
}

export function createPostgresMeasurementsRepository(): MeasurementsRepository {
  const pool = getPool()

  return {
    async create(input: CreateMeasurementInput): Promise<Measurement> {
      const { rows } = await pool.query<MeasurementRow>(
        `
        INSERT INTO measurements (
          id, experiment_id, timestamp,
          dirty_gas, dirty_humidity, dirty_temperature,
          clean_gas, clean_humidity, clean_temperature
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING ${COLUMNS}
        `,
        [
          randomUUID(),
          input.experimentId,
          input.timestamp,
          input.dirtyAir.gas,
          input.dirtyAir.humidity,
          input.dirtyAir.temperature,
          input.cleanAir.gas,
          input.cleanAir.humidity,
          input.cleanAir.temperature,
        ],
      )
      return mapRow(rows[0]!)
    },

    async getLatest(): Promise<Measurement | null> {
      const { rows } = await pool.query<MeasurementRow>(
        `SELECT ${COLUMNS} FROM measurements ORDER BY timestamp DESC LIMIT 1`,
      )
      return rows[0] ? mapRow(rows[0]) : null
    },

    async list(filters: MeasurementFilters = {}): Promise<Measurement[]> {
      const { text, values } = buildListQuery(null, filters)
      const { rows } = await pool.query<MeasurementRow>(text, values)
      return rows.map(mapRow)
    },

    async listByExperiment(
      experimentId: string,
      filters: MeasurementFilters = {},
    ): Promise<Measurement[]> {
      const { text, values } = buildListQuery(experimentId, filters)
      const { rows } = await pool.query<MeasurementRow>(text, values)
      return rows.map(mapRow)
    },
  }
}