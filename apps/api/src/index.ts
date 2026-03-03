import cors from 'cors'
import express from 'express'
import { redis, redisSub } from './redis'
import { projectsRouter } from './routes/projects'
import { streamRouter } from './routes/stream'
import { errorHandler } from './middleware/errorHandler'
import './workers/pipeline.worker' // register worker on startup

const app = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_URL }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// API routes
app.use('/api/projects', projectsRouter)
app.use('/api/projects', streamRouter)

// Global error handler (must be last)
app.use(errorHandler)

async function start() {
  await redis.connect()
  await redisSub.connect()

  app.listen(PORT, () => {
    console.log(`ForgeOS API running on http://localhost:${PORT}`)
  })
}

start().catch(console.error)
