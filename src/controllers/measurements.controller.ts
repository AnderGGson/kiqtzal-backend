import type { Request, Response } from 'express'
import * as measurementService from '../services/measurements.service.js'

export function postMeasurement(req: Request, res: Response) {
  const measurement = measurementService.ingestMeasurement(req.body)
  res.status(201).json(measurement)
}

export function getLatestMeasurement(_req: Request, res: Response) {
  const measurement = measurementService.getLatestMeasurement()
  res.json(measurement)
}