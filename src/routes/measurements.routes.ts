import { Router } from 'express'
import * as measurementController from '../controllers/measurements.controller.js'

export const measurementsRouter = Router()

measurementsRouter.post('/', measurementController.postMeasurement)
measurementsRouter.get('/', measurementController.listMeasurements)
measurementsRouter.get('/latest', measurementController.getLatestMeasurement)