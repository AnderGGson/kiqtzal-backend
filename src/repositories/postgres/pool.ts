import { Pool } from 'pg'
import env from '../../config/env.js'

let _pool: Pool | undefined

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
    })
  }
  return _pool
}

export async function initializeSchema() {
  const pool = getPool()
  if (!env.databaseUrl) {
    throw new Error(
      'DATABASE_DRIVER=postgres pero DATABASE_URL no está configurada. ' +
        'Revisa .env o las variables de entorno del servicio (ver docs/deployment.md).',
    )
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiments (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      mode        TEXT NOT NULL,
      started_at  TIMESTAMPTZ NOT NULL,
      ended_at    TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS measurements (
      id                TEXT PRIMARY KEY,
      experiment_id     TEXT REFERENCES experiments(id),
      timestamp         TIMESTAMPTZ NOT NULL,
      dirty_gas         DOUBLE PRECISION NOT NULL,
      dirty_humidity    DOUBLE PRECISION NOT NULL,
      dirty_temperature DOUBLE PRECISION,
      clean_gas         DOUBLE PRECISION NOT NULL,
      clean_humidity    DOUBLE PRECISION NOT NULL,
      clean_temperature DOUBLE PRECISION
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_timestamp
      ON measurements (timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_measurements_experiment_timestamp
      ON measurements (experiment_id, timestamp DESC);
  `)
}