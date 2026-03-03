import { Router } from 'express'
import { prisma } from '../prisma'
import { redis } from '../redis'
import { Queue } from 'bullmq'
import {
    CreateProjectSchema,
    ApproveNodeSchema,
    RejectNodeSchema,
    MAX_REGENERATIONS,
    NodeStatus,
} from '@forgeos/shared'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { publishEvent } from '../lib/pubsub'
import { createReadStream, existsSync } from 'fs'
import path from 'path'

const router = Router()

const pipelineQueue = new Queue('agentPipeline', {
    connection: {
        host: redis.options.host ?? 'localhost',
        port: redis.options.port ?? 6379,
    },
})

// POST /api/projects — Create project, start pipeline
router.post(
    '/',
    validate(CreateProjectSchema),
    asyncHandler(async (req, res) => {
        const { concept, agencyId, mode } = req.body as {
            concept: string
            agencyId: string
            mode: string
        }

        const project = await prisma.project.create({
            data: {
                concept,
                agencyId,
                mode: mode as 'NEW' | 'ITERATE',
                status: 'PENDING',
                currentNode: 0,
            },
        })

        // Create AgentOutput stubs for nodes 1, 2, 3 (LOCKED)
        await prisma.agentOutput.createMany({
            data: [1, 2, 3].map((nodeId) => ({
                projectId: project.id,
                nodeId,
                version: 1,
                jsonPayload: {},
                status: nodeId === 1 ? 'QUEUED' as const : 'LOCKED' as const,
            })),
        })

        // Update project to RUNNING
        await prisma.project.update({
            where: { id: project.id },
            data: { status: 'RUNNING' },
        })

        // Queue first job
        await pipelineQueue.add('process-node', {
            projectId: project.id,
            nodeId: 1,
            agencyId,
            concept,
            previousOutputs: {},
        })

        res.status(201).json({ projectId: project.id, message: 'Pipeline started' })
    })
)

// GET /api/projects — List projects (paginated)
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const agencyId = req.query.agencyId as string
        if (!agencyId) {
            res.status(400).json({ error: 'agencyId is required' })
            return
        }

        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20))
        const skip = (page - 1) * limit

        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where: { agencyId },
                include: { agentOutputs: true, deployment: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.project.count({ where: { agencyId } }),
        ])

        res.json({ projects, total, page, limit })
    })
)

// GET /api/projects/:id — Get single project
router.get(
    '/:id',
    asyncHandler(async (req, res) => {
        const project = await prisma.project.findUnique({
            where: { id: req.params.id },
            include: { agentOutputs: true, deployment: true },
        })

        if (!project) {
            res.status(404).json({ error: 'Project not found' })
            return
        }

        res.json(project)
    })
)

// POST /api/projects/:id/nodes/:nodeId/approve
router.post(
    '/:id/nodes/:nodeId/approve',
    validate(ApproveNodeSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params
        const nodeId = parseInt(req.params.nodeId, 10)
        const { editedPayload } = req.body as { editedPayload?: Record<string, unknown> }

        // Find latest AgentOutput for this project/node
        const output = await prisma.agentOutput.findFirst({
            where: { projectId: id, nodeId },
            orderBy: { version: 'desc' },
        })

        if (!output) {
            res.status(404).json({ error: 'Agent output not found' })
            return
        }

        // Update output
        const updateData: Record<string, unknown> = {
            status: 'APPROVED',
            approvedAt: new Date(),
        }
        if (editedPayload) {
            updateData.jsonPayload = editedPayload
        }

        await prisma.agentOutput.update({
            where: { id: output.id },
            data: updateData,
        })

        // Gather all approved outputs for context
        const approvedOutputs = await prisma.agentOutput.findMany({
            where: { projectId: id, status: 'APPROVED' },
            orderBy: { nodeId: 'asc' },
        })

        const previousOutputs: Record<number, unknown> = {}
        for (const o of approvedOutputs) {
            previousOutputs[o.nodeId] = o.jsonPayload
        }

        const nextNodeId = nodeId + 1

        // Update project current node
        await prisma.project.update({
            where: { id },
            data: { currentNode: nextNodeId },
        })

        // Publish approved status
        await publishEvent(id, { type: 'NODE_STATUS', nodeId, status: NodeStatus.APPROVED })

        // Queue next job
        const project = await prisma.project.findUnique({ where: { id } })
        if (project) {
            await pipelineQueue.add('process-node', {
                projectId: id,
                nodeId: nextNodeId,
                agencyId: project.agencyId,
                concept: project.concept,
                previousOutputs,
            })

            // If next node has a LOCKED stub, set it to QUEUED
            await prisma.agentOutput.updateMany({
                where: { projectId: id, nodeId: nextNodeId, status: 'LOCKED' },
                data: { status: 'QUEUED' },
            })

            await publishEvent(id, { type: 'NODE_STATUS', nodeId: nextNodeId, status: NodeStatus.QUEUED })
        }

        res.json({ success: true })
    })
)

// POST /api/projects/:id/nodes/:nodeId/reject
router.post(
    '/:id/nodes/:nodeId/reject',
    validate(RejectNodeSchema),
    asyncHandler(async (req, res) => {
        const { id } = req.params
        const nodeId = parseInt(req.params.nodeId, 10)
        const { feedback } = req.body as { feedback: string }

        // Find latest output
        const output = await prisma.agentOutput.findFirst({
            where: { projectId: id, nodeId },
            orderBy: { version: 'desc' },
        })

        if (!output) {
            res.status(404).json({ error: 'Agent output not found' })
            return
        }

        // Check max regenerations
        if (output.version >= MAX_REGENERATIONS) {
            res.status(429).json({ error: 'Max regenerations reached', maxVersion: MAX_REGENERATIONS })
            return
        }

        // Set current output to FAILED
        await prisma.agentOutput.update({
            where: { id: output.id },
            data: { status: 'FAILED', rejectedReason: feedback },
        })

        // Create new version
        const newVersion = output.version + 1
        await prisma.agentOutput.create({
            data: {
                projectId: id,
                nodeId,
                version: newVersion,
                jsonPayload: {},
                status: 'QUEUED',
            },
        })

        // Publish regenerating status
        await publishEvent(id, { type: 'NODE_STATUS', nodeId, status: NodeStatus.REGENERATING })

        // Queue re-processing with feedback
        const project = await prisma.project.findUnique({ where: { id } })
        if (project) {
            // Gather previous approved outputs
            const approvedOutputs = await prisma.agentOutput.findMany({
                where: { projectId: id, status: 'APPROVED' },
                orderBy: { nodeId: 'asc' },
            })
            const previousOutputs: Record<number, unknown> = {}
            for (const o of approvedOutputs) {
                previousOutputs[o.nodeId] = o.jsonPayload
            }

            await pipelineQueue.add('process-node', {
                projectId: id,
                nodeId,
                agencyId: project.agencyId,
                concept: project.concept,
                previousOutputs,
                rejectionFeedback: feedback,
            })
        }

        res.json({ success: true, newVersion })
    })
)

// GET /api/projects/:id/download — Stream ZIP
router.get(
    '/:id/download',
    asyncHandler(async (req, res) => {
        const deployment = await prisma.deployment.findUnique({
            where: { projectId: req.params.id },
        })

        if (!deployment?.zipPath || !existsSync(deployment.zipPath)) {
            res.status(404).json({ error: 'ZIP not available' })
            return
        }

        const filename = path.basename(deployment.zipPath)
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        createReadStream(deployment.zipPath).pipe(res)
    })
)

export { router as projectsRouter }
