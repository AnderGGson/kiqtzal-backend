import type { Pool, QueryResultRow } from 'pg'
import type { CreateMeasurementInput, Measurement } from '../types/index.js'

interface MeasurementRow extends QueryResultRow {
  id: number
  temp_abajo: number | string
  hum_abajo: number | string
  mq_abajo_raw: number
  temp_arriba: number | string
  hum_arriba: number | string
  mq_arriba_raw: number
  created_at: Date | string
}

export interface ListMeasurementsFilters {
  from?: string
  to?: string
  limit: number
  offset: number
}

const measurementColumns = `
  id,
  temp_abajo,
  hum_abajo,
  mq_abajo_raw,
  temp_arriba,
  hum_arriba,
  mq_arriba_raw,
  created_at AT TIME ZONE 'UTC' AS created_at
`

function toMeasurement(row: MeasurementRow): Measurement {
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at)

  if (Number.isNaN(createdAt.getTime())) {
    throw new Error('PostgreSQL devolvió una fecha de creación inválida')
  }

  return {
    id: row.id,
    temp_abajo: Number(row.temp_abajo),
    hum_abajo: Number(row.hum_abajo),
    mq_abajo_raw: row.mq_abajo_raw,
    temp_arriba: Number(row.temp_arriba),
    hum_arriba: Number(row.hum_arriba),
    mq_arriba_raw: row.mq_arriba_raw,
    created_at: createdAt.toISOString(),
  }
}

export function createMeasurementsRepository(pool: Pool) {
  return {
    async create(input: CreateMeasurementInput): Promise<Measurement> {
      const result = await pool.query<MeasurementRow>(
        `
          INSERT INTO public.mediciones_aire (
            temp_abajo,
            hum_abajo,
            mq_abajo_raw,
            temp_arriba,
            hum_arriba,
            mq_arriba_raw
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING
            id,
            temp_abajo,
            hum_abajo,
            mq_abajo_raw,
            temp_arriba,
            hum_arriba,
            mq_arriba_raw,
            created_at AT TIME ZONE 'UTC' AS created_at
        `,
        [
          input.temp_abajo,
          input.hum_abajo,
          input.mq_abajo_raw,
          input.temp_arriba,
          input.hum_arriba,
          input.mq_arriba_raw,
        ],
      )

      return toMeasurement(result.rows[0])
    },

    async getLatest(): Promise<Measurement | null> {
      const result = await pool.query<MeasurementRow>(`
        SELECT ${measurementColumns}
        FROM public.mediciones_aire
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `)

      return result.rows[0] ? toMeasurement(result.rows[0]) : null
    },

    async list(filters: ListMeasurementsFilters): Promise<Measurement[]> {
      const conditions: string[] = []
      const values: unknown[] = []

      if (filters.from) {
        values.push(filters.from)
        conditions.push(`(created_at AT TIME ZONE 'UTC') >= $${values.length}::timestamptz`)
      }

      if (filters.to) {
        values.push(filters.to)
        conditions.push(`(created_at AT TIME ZONE 'UTC') <= $${values.length}::timestamptz`)
      }

      values.push(filters.limit, filters.offset)

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limitPosition = values.length - 1
      const offsetPosition = values.length

      const result = await pool.query<MeasurementRow>(
        `
          SELECT ${measurementColumns}
          FROM public.mediciones_aire
          ${whereClause}
          ORDER BY created_at DESC, id DESC
          LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        values,
      )

      return result.rows.map(toMeasurement)
    },
  }
}
