import { Router } from 'express'
import { Redis } from 'ioredis'
import { prisma } from '../prisma'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()

// GET /api/projects/:id/stream — SSE endpoint
router.get(
    '/:id/stream',
    asyncHandler(async (req, res) => {
        const projectId = req.params.id

        // Verify project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { agentOutputs: { orderBy: { nodeId: 'asc' } } },
        })

        if (!project) {
            res.status(404).json({ error: 'Project not found' })
            return
        }

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        let eventId = 0

        // Helper to write SSE event
        const writeEvent = (data: string) => {
            eventId++
            res.write(`id: ${eventId}\ndata: ${data}\n\n`)
        }

        // Replay missed events if Last-Event-ID is present
        const lastEventId = req.headers['last-event-id']
        if (lastEventId) {
            const logKey = `project:${projectId}:event-log`
            const subscriber = new Redis(process.env.REDIS_URL!)
            const events = await subscriber.lrange(logKey, -20, -1)
            await subscriber.quit()

            const startFrom = parseInt(lastEventId as string, 10)
            for (const evt of events) {
                eventId++
                if (eventId > startFrom) {
                    res.write(`id: ${eventId}\ndata: ${evt}\n\n`)
                }
            }
        }

        // Send initial snapshot
        const currentOutput = project.agentOutputs.find(
            (o) => o.nodeId === project.currentNode
        )
        if (currentOutput) {
            writeEvent(
                JSON.stringify({
                    type: 'NODE_STATUS',
                    nodeId: project.currentNode,
                    status: currentOutput.status,
                })
            )
        }

        // Subscribe to Redis channel for live events
        const subscriber = new Redis(process.env.REDIS_URL!)
        const channel = `project:${projectId}:events`

        subscriber.subscribe(channel, (err) => {
            if (err) {
                console.error(`[SSE] Failed to subscribe to ${channel}:`, err.message)
            }
        })

        subscriber.on('message', (_ch: string, message: string) => {
            writeEvent(message)
        })

        // Heartbeat every 15s
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n')
        }, 15_000)

        // Cleanup on disconnect
        req.on('close', () => {
            clearInterval(heartbeat)
            subscriber.unsubscribe(channel).catch(() => { })
            subscriber.quit().catch(() => { })
            console.log(`[SSE] Client disconnected from project ${projectId}`)
        })
    })
)

export { router as streamRouter }
