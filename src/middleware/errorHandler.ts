import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

const databaseUnavailableCodes = new Set([
  '08001',
  '08004',
  '08006',
  '53300',
  '57P01',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
])

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: error.issues,
      },
    })
    return
  }

  const requestError = error as {
    code?: unknown
    status?: unknown
    type?: unknown
  }

  if (requestError.status === 400 && requestError.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'El cuerpo debe ser JSON válido' },
    })
    return
  }

  if (requestError.status === 413) {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo es demasiado grande' },
    })
    return
  }

  if (requestError.status === 415) {
    res.status(415).json({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type no compatible' },
    })
    return
  }

  if (typeof requestError.code === 'string' && databaseUnavailableCodes.has(requestError.code)) {
    console.error('PostgreSQL no está disponible:', requestError.code)
    res.status(503).json({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'Base de datos no disponible' },
    })
    return
  }

  console.error('Error interno no controlado')
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  })
}
