import type { Request, Response } from 'express'
import * as measurementService from '../services/measurements.service.js'

export async function postMeasurement(req: Request, res: Response) {
  const measurement = await measurementService.ingestMeasurement(req.body)
  res.status(201).json(measurement)
}

export async function getLatestMeasurement(_req: Request, res: Response) {
  const measurement = await measurementService.getLatestMeasurement()
  res.json(measurement)
}

export async function getMeasurements(req: Request, res: Response) {
  const measurements = await measurementService.listMeasurements(req.query)
  res.json(measurements)
}
