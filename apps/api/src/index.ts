import cors from 'cors'
import express from 'express'
import { redis, redisSub } from './redis'
import { projectsRouter } from './routes/projects'
import { streamRouter } from './routes/stream'
import { agenciesRouter } from './routes/agencies'
import { exportRouter } from './routes/export'
import { errorHandler } from './middleware/errorHandler'
import './workers/pipeline.worker' // register worker on startup

const app = express()
const PORT = process.env.PORT ?? 3001
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true)
    // In development, allow any localhost origin
    if (origin.startsWith('http://localhost:')) return callback(null, true)
    // In production, only allow the configured frontend URL
    if (origin === FRONTEND_URL) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// API routes
app.use('/api/projects', projectsRouter)
app.use('/api/projects', streamRouter)
app.use('/api/agencies', agenciesRouter)
app.use('/api/pipeline', exportRouter)

// Global error handler (must be last)
app.use(errorHandler)

async function start() {
  await redis.connect()
  await redisSub.connect()

  app.listen(PORT, () => {
    console.log(`ForgeOS API running on http://localhost:${PORT}`)
    console.log(`\n--- Environment Variables ---`)
    console.log(`DATABASE_URL:          ${process.env.DATABASE_URL ? '✅ SET' : '❌ MISSING'}`)
    console.log(`REDIS_URL:             ${process.env.REDIS_URL ?? '❌ MISSING'}`)
    console.log(`DO_GRADIENT_API_KEY:   ${process.env.DO_GRADIENT_API_KEY ? `✅ SET (${process.env.DO_GRADIENT_API_KEY.slice(0, 12)}...)` : '❌ MISSING'}`)
    console.log(`DO_API_TOKEN:          ${process.env.DO_API_TOKEN ? `✅ SET (${process.env.DO_API_TOKEN.slice(0, 12)}...)` : '❌ MISSING'}`)
    console.log(`GITHUB_TOKEN:          ${process.env.GITHUB_TOKEN ? `✅ SET (${process.env.GITHUB_TOKEN.slice(0, 12)}...)` : '❌ MISSING'}`)
    console.log(`GITHUB_ORG:            ${process.env.GITHUB_ORG ?? '❌ MISSING'}`)
    console.log(`DO_KNOWLEDGE_BASE_UUID:${process.env.DO_KNOWLEDGE_BASE_UUID ? ' ✅ SET' : ' ❌ MISSING'}`)
    console.log(`FRONTEND_URL:          ${process.env.FRONTEND_URL ?? '❌ MISSING'}`)
    console.log(`NODE_ENV:              ${process.env.NODE_ENV ?? '❌ MISSING'}`)
    console.log(`----------------------------\n`)
  })
}

start().catch(console.error)
