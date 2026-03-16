import { Router } from 'express'
import { prisma } from '../prisma'
import { redis } from '../redis'
import { Queue } from 'bullmq'
import {
    CreateProjectSchema,
    ApproveNodeSchema,
    RejectNodeSchema,
    ClarifyConceptSchema,
    MAX_REGENERATIONS,
    NodeStatus,
} from '@forgeos/shared'
import type { ClarifyQuestion } from '@forgeos/shared'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../middleware/asyncHandler'
import { publishEvent } from '../lib/pubsub'
import { gradientClient } from '../lib/gradient'
import { DEMO_CLARIFY_QUESTIONS, delay } from '../lib/demo-fixtures'
import { createReadStream, existsSync } from 'fs'
import path from 'path'

const router = Router()

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const parsedRedis = new URL(redisUrl)

console.log(`[Queue] Connecting BullMQ to ${parsedRedis.hostname}:${parsedRedis.port}`)

const pipelineQueue = new Queue('agentPipeline', {
    connection: {
        host: parsedRedis.hostname,
        port: parseInt(parsedRedis.port || '6379'),
        password: parsedRedis.password || undefined,
        tls: parsedRedis.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    },
})

// POST /api/projects/clarify — AI generates clarifying questions for a concept
router.post(
    '/clarify',
    validate(ClarifyConceptSchema),
    asyncHandler(async (req, res) => {
        const { concept, demoMode } = req.body as { concept: string; demoMode?: boolean }

        if (demoMode) {
            await delay(1000)
            res.json({ questions: DEMO_CLARIFY_QUESTIONS })
            return
        }

        const systemPrompt = `You are a product discovery expert. Given a raw SaaS concept, generate 3-5 clarifying questions that will help an AI pipeline produce better results.

Each question should help understand: target audience, core problem, existing solutions, must-have features, or monetization approach.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanation. Pure JSON only.`

        const userPrompt = `Generate clarifying questions for this SaaS concept: "${concept}"

Return JSON with EXACTLY this structure:
{
  "questions": [
    { "id": "unique_snake_case_id", "question": "The question text", "type": "text", "placeholder": "Helpful placeholder text" },
    { "id": "another_id", "question": "Question text", "type": "select", "options": ["Option 1", "Option 2", "Option 3"] },
    { "id": "multi_id", "question": "Question text", "type": "multiselect", "options": ["Option 1", "Option 2", "Option 3"] }
  ]
}

Rules:
- Generate 3-5 questions total
- "type" must be one of: "text", "select", "multiselect"
- "text" questions must have a "placeholder" field
- "select" and "multiselect" questions must have an "options" array with 3-6 options
- Questions should be specific to the concept, not generic
- Each question should surface a different aspect (audience, problem, features, competition, monetization)
- Keep questions concise and actionable`

        try {
            const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 1500, temperature: 0.6 })
            const parsed = gradientClient.parseJSON<{ questions: ClarifyQuestion[] }>(raw)
            res.json({ questions: parsed.questions })
        } catch (err: unknown) {
            console.error('[POST /clarify] LLM error:', err)
            res.status(500).json({ error: 'Failed to generate clarifying questions' })
        }
    })
)

// POST /api/projects — Create project, start pipeline
router.post(
    '/',
    validate(CreateProjectSchema),
    asyncHandler(async (req, res) => {
        const { concept, agencyId, mode, demoMode } = req.body as {
            concept: string
            agencyId: string
            mode: string
            demoMode?: boolean
        }

        // Ensure the agency exists (auto-create for demo)
        await prisma.agency.upsert({
            where: { id: agencyId },
            update: {},
            create: { id: agencyId, name: 'Demo Agency' },
        })

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
        console.log(`[POST /projects] Queuing job for project ${project.id} node 1...`)
        const job = await pipelineQueue.add('process-node', {
            projectId: project.id,
            nodeId: 1,
            agencyId,
            concept,
            previousOutputs: {},
            demoMode: demoMode ?? false,
        })
        console.log(`[POST /projects] ✅ Job queued with id: ${job.id}`)

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
        const { editedPayload, demoMode } = req.body as { editedPayload?: Record<string, unknown>; demoMode?: boolean }

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
                demoMode: demoMode ?? false,
            })

            // Find the latest output for the next node
            const nextNodeOutput = await prisma.agentOutput.findFirst({
                where: { projectId: id, nodeId: nextNodeId },
                orderBy: { version: 'desc' },
            })

            if (!nextNodeOutput) {
                // Should not happen if initial stubs were created, but fallback
                await prisma.agentOutput.create({
                    data: {
                        projectId: id,
                        nodeId: nextNodeId,
                        version: 1,
                        jsonPayload: {},
                        status: 'QUEUED',
                    },
                })
            } else if (nextNodeOutput.status === 'LOCKED') {
                // If it's just a stub, activate it
                await prisma.agentOutput.update({
                    where: { id: nextNodeOutput.id },
                    data: { status: 'QUEUED' },
                })
            } else {
                // If it already ran in a previous pipeline execution, create a new version
                await prisma.agentOutput.create({
                    data: {
                        projectId: id,
                        nodeId: nextNodeId,
                        version: nextNodeOutput.version + 1,
                        jsonPayload: {},
                        status: 'QUEUED',
                    },
                })
            }

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
        const { feedback, demoMode } = req.body as { feedback: string; demoMode?: boolean }

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
                demoMode: demoMode ?? false,
            })
        }

        res.json({ success: true, newVersion })
    })
)

// POST /api/projects/:id/nodes/:nodeId/retry — retry a FAILED node
router.post(
    '/:id/nodes/:nodeId/retry',
    asyncHandler(async (req, res) => {
        const { id } = req.params
        const nodeId = parseInt(req.params.nodeId, 10)

        const output = await prisma.agentOutput.findFirst({
            where: { projectId: id, nodeId },
            orderBy: { version: 'desc' },
        })

        if (!output) {
            res.status(404).json({ error: 'Agent output not found' })
            return
        }

        if (output.status !== 'FAILED') {
            res.status(400).json({ error: 'Node is not in FAILED state' })
            return
        }

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

        await prisma.project.update({
            where: { id },
            data: { status: 'RUNNING' },
        })

        await publishEvent(id, { type: 'NODE_STATUS', nodeId, status: NodeStatus.QUEUED })
        await publishEvent(id, { type: 'LOG', nodeId, level: 'info', message: 'Retrying node...', timestamp: new Date().toISOString() })

        // Gather previous approved outputs
        const project = await prisma.project.findUnique({ where: { id } })
        if (project) {
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
                demoMode: false,
            })
        }

        res.json({ success: true, newVersion })
    })
)
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

// GET /api/projects/:id/download — Stream ZIP
// POST /api/projects/:id/start — Manually start/restart the pipeline from Node 1
router.post(
    '/:id/start',
    asyncHandler(async (req, res) => {
        const { id } = req.params

        const project = await prisma.project.findUnique({ where: { id } })
        if (!project) {
            res.status(404).json({ error: 'Project not found' })
            return
        }

        // Reset Node 1 to QUEUED if it's stuck
        const existingOutput = await prisma.agentOutput.findFirst({
            where: { projectId: id, nodeId: 1 },
            orderBy: { version: 'desc' },
        })

        if (existingOutput && existingOutput.status === 'QUEUED') {
            // Already queued, just re-add job
        } else if (existingOutput) {
            // Create a new version
            await prisma.agentOutput.create({
                data: {
                    projectId: id,
                    nodeId: 1,
                    version: (existingOutput.version || 0) + 1,
                    jsonPayload: {},
                    status: 'QUEUED',
                },
            })

            // Also lock downstream nodes so they don't hydrate as APPROVED from a previous run
            for (const nId of [2, 3]) {
                const existingDownstream = await prisma.agentOutput.findFirst({
                    where: { projectId: id, nodeId: nId },
                    orderBy: { version: 'desc' },
                })
                if (existingDownstream) {
                    await prisma.agentOutput.create({
                        data: {
                            projectId: id,
                            nodeId: nId,
                            version: existingDownstream.version + 1,
                            jsonPayload: {},
                            status: 'LOCKED',
                        },
                    })
                }
            }
        } else {
            // No output exists — create initial stubs
            await prisma.agentOutput.createMany({
                data: [1, 2, 3].map((nodeId) => ({
                    projectId: id,
                    nodeId,
                    version: 1,
                    jsonPayload: {},
                    status: nodeId === 1 ? 'QUEUED' as const : 'LOCKED' as const,
                })),
            })
        }

        await prisma.project.update({
            where: { id },
            data: { status: 'RUNNING', currentNode: 1 },
        })

        await publishEvent(id, { type: 'NODE_STATUS', nodeId: 1, status: NodeStatus.QUEUED })
        await publishEvent(id, { type: 'LOG', nodeId: 1, level: 'info', message: 'Pipeline started manually', timestamp: new Date().toISOString() })

        await pipelineQueue.add('process-node', {
            projectId: id,
            nodeId: 1,
            agencyId: project.agencyId,
            concept: project.concept,
            previousOutputs: {},
            demoMode: false,
        })

        res.json({ success: true, message: 'Pipeline started' })
    })
)

// POST /api/projects/:id/resume — Resume pipeline from where it stopped
router.post(
    '/:id/resume',
    asyncHandler(async (req, res) => {
        const { id } = req.params

        const project = await prisma.project.findUnique({ where: { id } })
        if (!project) {
            res.status(404).json({ error: 'Project not found' })
            return
        }

        // Find the most recent APPROVED node
        const lastApproved = await prisma.agentOutput.findFirst({
            where: { projectId: id, status: 'APPROVED' },
            orderBy: { nodeId: 'desc' },
        })

        const nextNodeId = lastApproved ? lastApproved.nodeId + 1 : 1

        if (nextNodeId > 4) {
            res.json({ success: true, message: 'Pipeline already completed' })
            return
        }

        const nextNodeOutput = await prisma.agentOutput.findFirst({
            where: { projectId: id, nodeId: nextNodeId },
            orderBy: { version: 'desc' },
        })

        if (!nextNodeOutput) {
            await prisma.agentOutput.create({
                data: {
                    projectId: id,
                    nodeId: nextNodeId,
                    version: 1,
                    jsonPayload: {},
                    status: 'QUEUED',
                },
            })
        } else if (nextNodeOutput.status === 'LOCKED' || nextNodeOutput.status === 'FAILED') {
            await prisma.agentOutput.update({
                where: { id: nextNodeOutput.id },
                data: { status: 'QUEUED' },
            })
        } else {
            await prisma.agentOutput.create({
                data: {
                    projectId: id,
                    nodeId: nextNodeId,
                    version: nextNodeOutput.version + 1,
                    jsonPayload: {},
                    status: 'QUEUED',
                },
            })
        }

        await prisma.project.update({
            where: { id },
            data: { status: 'RUNNING', currentNode: nextNodeId },
        })

        await publishEvent(id, { type: 'NODE_STATUS', nodeId: nextNodeId, status: NodeStatus.QUEUED })
        await publishEvent(id, { type: 'LOG', nodeId: nextNodeId, level: 'info', message: 'Pipeline resumed', timestamp: new Date().toISOString() })

        const approvedOutputs = await prisma.agentOutput.findMany({
            where: { projectId: id, status: 'APPROVED' },
            orderBy: { nodeId: 'asc' },
        })
        const previousOutputs: Record<number, unknown> = {}
        for (const o of approvedOutputs) {
            previousOutputs[o.nodeId] = o.jsonPayload
        }

        const demoMode = (req.body as { demoMode?: boolean }).demoMode ?? false

        await pipelineQueue.add('process-node', {
            projectId: id,
            nodeId: nextNodeId,
            agencyId: project.agencyId,
            concept: project.concept,
            previousOutputs,
            demoMode,
        })

        res.json({ success: true, message: `Pipeline resumed at node ${nextNodeId}` })
    })
)

// DELETE /api/projects/:id — Delete a project and all related data
router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params

        const project = await prisma.project.findUnique({ where: { id } })
        if (!project) {
            res.status(404).json({ error: 'Project not found' })
            return
        }

        // Delete related data first (foreign key constraints)
        await prisma.agentOutput.deleteMany({ where: { projectId: id } })
        await prisma.deployment.deleteMany({ where: { projectId: id } })
        await prisma.project.delete({ where: { id } })

        res.json({ success: true, message: 'Project deleted' })
    })
)

// POST /api/projects/:id/iterate
// Body: { prompt: string }
router.post(
    '/:id/iterate',
    asyncHandler(async (req, res) => {
        const { id } = req.params
        const { prompt } = req.body as { prompt: string }

        if (!prompt?.trim()) {
            res.status(400).json({ error: 'prompt is required' })
            return
        }

        const parent = await prisma.project.findUnique({
            where: { id },
            include: { deployment: true, agentOutputs: { where: { status: 'APPROVED' } } },
        })

        if (!parent) {
            res.status(404).json({ error: 'Project not found' })
            return
        }

        if (parent.status !== 'COMPLETED') {
            res.status(400).json({ error: 'Project must be COMPLETED to iterate' })
            return
        }

        const iterProject = await prisma.project.create({
            data: {
                concept: `${parent.concept} — ${prompt}`,
                agencyId: parent.agencyId,
                mode: 'ITERATE',
                status: 'RUNNING',
                currentNode: 1,
            },
        })

        await prisma.agentOutput.createMany({
            data: [1, 2, 3].map((nodeId) => ({
                projectId: iterProject.id,
                nodeId,
                version: 1,
                jsonPayload: {},
                status: nodeId === 1 ? 'QUEUED' as const : 'LOCKED' as const,
            })),
        })

        const previousOutputs: Record<number, unknown> = {}
        for (const o of parent.agentOutputs) {
            previousOutputs[o.nodeId] = o.jsonPayload
        }

        await pipelineQueue.add('process-node', {
            projectId: iterProject.id,
            nodeId: 1,
            agencyId: parent.agencyId,
            concept: iterProject.concept,
            previousOutputs,
            mode: 'ITERATE',
            existingGithubRepo: parent.deployment?.githubRepoUrl?.replace('https://github.com/', '') ?? '',
            iterationPrompt: prompt,
        })

        res.status(201).json({ projectId: iterProject.id })
    })
)

export { router as projectsRouter }
