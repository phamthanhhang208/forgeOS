import { Worker, Job } from 'bullmq'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import { publishEvent } from '../lib/pubsub'
import { NodeStatus } from '@forgeos/shared'
import { runStrategist, StrategistOutput } from './agents/strategist'
import { runAnalyst, AnalystOutput } from './agents/analyst'
import { runTechLead, TechLeadOutput } from './agents/techlead'

interface PipelineJobData {
    projectId: string
    nodeId: number
    agencyId: string
    concept: string
    previousOutputs: Record<number, unknown>
    rejectionFeedback?: string
}

const worker = new Worker<PipelineJobData>(
    'agentPipeline',
    async (job: Job<PipelineJobData>) => {
        const { projectId, nodeId } = job.data

        // 1. Publish PROCESSING status
        await publishEvent(projectId, { type: 'NODE_STATUS', nodeId, status: NodeStatus.PROCESSING })

        // 2. Update DB: set AgentOutput status to PROCESSING
        await prisma.agentOutput.updateMany({
            where: { projectId, nodeId, status: { in: ['QUEUED', 'REGENERATING'] } },
            data: { status: 'PROCESSING' },
        })

        // 3. Route to agent
        let payload: object
        switch (nodeId) {
            case 1: {
                payload = await runStrategist({
                    agencyId: job.data.agencyId,
                    concept: job.data.concept,
                    rejectionFeedback: job.data.rejectionFeedback,
                })
                break
            }
            case 2: {
                const strategyOutput = job.data.previousOutputs[1] as StrategistOutput
                payload = await runAnalyst({
                    concept: job.data.concept,
                    strategyOutput,
                    rejectionFeedback: job.data.rejectionFeedback,
                })
                break
            }
            case 3: {
                const strategyOutput = job.data.previousOutputs[1] as StrategistOutput
                const analystOutput = job.data.previousOutputs[2] as AnalystOutput
                payload = await runTechLead({
                    concept: job.data.concept,
                    strategyOutput,
                    analystOutput,
                    rejectionFeedback: job.data.rejectionFeedback,
                })
                break
            }
            case 4: {
                // Shipyard stub — implemented in Phase 5
                await new Promise((r) => setTimeout(r, 1000))
                payload = { _stub: true, nodeId: 4, status: 'Shipyard stub complete' }
                break
            }
            default:
                throw new Error(`Unknown nodeId: ${nodeId}`)
        }

        // 4. Save payload to DB
        const output = await prisma.agentOutput.findFirst({
            where: { projectId, nodeId, status: 'PROCESSING' },
            orderBy: { version: 'desc' },
        })

        if (!output) {
            throw new Error(`No PROCESSING AgentOutput found for project ${projectId} node ${nodeId}`)
        }

        await prisma.agentOutput.update({
            where: { id: output.id },
            data: { jsonPayload: payload as Prisma.InputJsonValue, status: 'REVIEW' },
        })

        await prisma.project.update({
            where: { id: projectId },
            data: { status: 'AWAITING_REVIEW', currentNode: nodeId },
        })

        // 5. Publish REVIEW with payload
        await publishEvent(projectId, {
            type: 'NODE_PAYLOAD',
            nodeId,
            version: output.version,
            payload: payload as Record<string, unknown>,
        })
        await publishEvent(projectId, { type: 'NODE_STATUS', nodeId, status: NodeStatus.REVIEW })
    },
    {
        connection: {
            host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
            port: process.env.REDIS_URL
                ? parseInt(new URL(process.env.REDIS_URL).port || '6379', 10)
                : 6379,
        },
        concurrency: 5,
    }
)

// Worker error handlers — don't crash on job failure
worker.on('failed', async (job, err) => {
    if (!job) return
    const { projectId, nodeId } = job.data
    console.error(`[Worker] Job failed for project ${projectId} node ${nodeId}:`, err.message)
    await publishEvent(projectId, { type: 'ERROR', nodeId, message: err.message })
    await prisma.agentOutput.updateMany({
        where: { projectId, nodeId, status: 'PROCESSING' },
        data: { status: 'FAILED' },
    })
})

worker.on('error', (err) => {
    console.error('[Worker] Error:', err.message)
})

export { worker }
