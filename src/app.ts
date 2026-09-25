import cors from 'cors'
import express from 'express'
import env from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { apiRouter } from './routes/index.js'

export const app = express()

app.use(cors({ origin: env.corsOrigin }))
app.use(express.json({ limit: '16kb' }))
app.use(env.apiPrefix, apiRouter)
app.use(notFound)
app.use(errorHandler)

export default app
