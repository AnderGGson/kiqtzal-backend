import { Router } from 'express'
import * as experimentController from '../controllers/experiments.controller.js'

export const experimentsRouter = Router()

experimentsRouter.get('/', experimentController.listExperiments)
experimentsRouter.get('/:id', experimentController.getExperimentById)
experimentsRouter.get('/:id/measurements', experimentController.getMeasurementsByExperiment)