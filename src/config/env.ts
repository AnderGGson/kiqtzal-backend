export type DatabaseDriver = 'memory' | 'postgres'

const env = {
  port: Number(process.env.PORT ?? 3001),
  apiPrefix: '/api',
  databaseDriver: (process.env.DATABASE_DRIVER ?? 'memory') as DatabaseDriver,
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: process.env.DATABASE_SSL === 'true',
  webDist: process.env.WEB_DIST ?? '../kiqtzal-frontend/dist',
}

export default env