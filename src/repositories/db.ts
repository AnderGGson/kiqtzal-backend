import { Pool } from 'pg'
import env from '../config/env.js'
import { createMeasurementsRepository } from './measurements.repository.js'

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: false },
})

pool.on('error', (error) => {
  console.error('Error inesperado del pool de PostgreSQL:', error.message)
})

export interface Database {
  measurements: ReturnType<typeof createMeasurementsRepository>
  ping(): Promise<void>
}

export const database: Database = {
  measurements: createMeasurementsRepository(pool),
  async ping() {
    await pool.query('SELECT 1')
  },
}
