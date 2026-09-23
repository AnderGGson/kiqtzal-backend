import { Router } from 'express'
import { experimentsRouter } from './experiments.routes.js'
import { measurementsRouter } from './measurements.routes.js'

export const apiRouter = Router()

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() })
})

apiRouter.use('/experiments', experimentsRouter)
apiRouter.use('/measurements', measurementsRouter)