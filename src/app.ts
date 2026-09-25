import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import env from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { apiRouter } from './routes/index.js'

export const app = express()

app.use(cors())
app.use(express.json())
app.use(env.apiPrefix, apiRouter)

const moduleDir = dirname(fileURLToPath(import.meta.url))
const webDist = isAbsolute(env.webDist)
  ? env.webDist
  : resolve(moduleDir, '..', env.webDist)

if (existsSync(webDist)) {
  app.use(express.static(webDist))
  app.get(/^\/(?!api)/, (_req, res) => {
    res.sendFile(join(webDist, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)