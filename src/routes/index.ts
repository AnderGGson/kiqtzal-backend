import { Router } from 'express'
import * as measurementService from '../services/measurements.service.js'
import { measurementsRouter } from './measurements.routes.js'

export const apiRouter = Router()

apiRouter.get('/health', async (_req, res) => {
  try {
    await measurementService.checkDatabaseConnection()
    res.json({
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({
      status: 'error',
      database: 'down',
      timestamp: new Date().toISOString(),
    })
  }
})

apiRouter.use('/measurements', measurementsRouter)
