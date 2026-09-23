import type { Request, Response } from 'express'
import * as experimentService from '../services/experiments.service.js'
import { parseOptionalString, parsePositiveInt } from '../utils/query.js'

export function listExperiments(req: Request, res: Response) {
  const experiments = experimentService.listExperiments({
    limit: parsePositiveInt(req.query.limit),
    offset: parsePositiveInt(req.query.offset),
  })
  res.json(experiments)
}

export function getExperimentById(req: Request, res: Response) {
  const experiment = experimentService.getExperimentById(String(req.params.id))
  if (!experiment) {
    res.status(404).json({
      error: { code: 'EXPERIMENT_NOT_FOUND', message: 'Experimento no encontrado' },
    })
    return
  }
  res.json(experiment)
}

export function getMeasurementsByExperiment(req: Request, res: Response) {
  const measurements = experimentService.getMeasurementsByExperiment(String(req.params.id), {
    from: parseOptionalString(req.query.from),
    to: parseOptionalString(req.query.to),
    after: parseOptionalString(req.query.after),
    limit: parsePositiveInt(req.query.limit),
    offset: parsePositiveInt(req.query.offset),
  })

  if (measurements === null) {
    res.status(404).json({
      error: { code: 'EXPERIMENT_NOT_FOUND', message: 'Experimento no encontrado' },
    })
    return
  }
  res.json(measurements)
}