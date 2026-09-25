import type { Request, Response } from 'express'
import * as measurementService from '../services/measurements.service.js'
import { parseOptionalString, parsePositiveInt } from '../utils/query.js'

export async function postMeasurement(req: Request, res: Response) {
  const measurement = await measurementService.ingestMeasurement(req.body)
  res.status(201).json(measurement)
}

export async function getLatestMeasurement(_req: Request, res: Response) {
  const measurement = await measurementService.getLatestMeasurement()
  res.json(measurement)
}

export async function listMeasurements(req: Request, res: Response) {
  const measurements = await measurementService.listMeasurements({
    from: parseOptionalString(req.query.from),
    to: parseOptionalString(req.query.to),
    after: parseOptionalString(req.query.after),
    limit: parsePositiveInt(req.query.limit),
    offset: parsePositiveInt(req.query.offset),
  })
  res.json(measurements)
}