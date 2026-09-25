import { Router } from 'express'
import * as measurementController from '../controllers/measurements.controller.js'

export const measurementsRouter = Router()

measurementsRouter.get('/', measurementController.getMeasurements)
measurementsRouter.get('/latest', measurementController.getLatestMeasurement)
measurementsRouter.post('/', measurementController.postMeasurement)
