# ForgeOS Node Studio — PHASE 2: Backend Core
# DigitalOcean Hackathon

---

## CONTEXT RECAP
ForgeOS is a multi-agent SaaS incubation platform. Phase 1 is complete:
- Monorepo scaffolded with pnpm workspaces
- `packages/shared` has all enums, types, Zod schemas, SSE event types
- Prisma schema migrated — 5 tables + pgvector active
- Express skeleton running on port 3001
- Redis + Postgres running via Docker

**Your job in Phase 2**: Build the complete backend core — all API routes, BullMQ pipeline worker skeleton, SSE streaming, and the DO Gradient API client. By the end, a POST to `/api/projects` should create a DB record, queue a job, and the frontend should be able to SSE-stream status events. No AI agents yet — just the plumbing.

---

## MCP SERVERS — USE THESE
- **digitalocean** → verify your DO Gradient API key is working; check DO account status
- **context7** → use for BullMQ, ioredis, Express docs
- **prisma** → verify DB records after API calls
- **postgres** → inspect data during testing

---

## TASK 1: Middleware (`apps/api/src/middleware/`)

### `validate.ts` — Zod request validation middleware:
```typescript
// Generic middleware factory: validate(schema) returns RequestHandler
// Validates req.body against schema
// On failure: res.status(400).json({ error: 'Validation failed', details: zodError.flatten() })
// On success: calls next()
// Export: validate(schema: ZodSchema)
```

### `asyncHandler.ts` — wrap async route handlers to catch errors:
```typescript
// Wraps an async RequestHandler
// Catches any thrown error and passes to next(err)
// Prevents unhandled promise rejections from crashing Express
```

### `errorHandler.ts` — global Express error handler:
```typescript
// 4-arg Express error handler: (err, req, res, next)
// Log error with timestamp
// Return: res.status(500).json({ error: err.message || 'Internal server error' })
```

---

## TASK 2: API Routes (`apps/api/src/routes/`)

### `projects.ts`

**POST `/api/projects`**
- Validate body with `CreateProjectSchema` from `@forgeos/shared`
- Create `Project` record in DB with `status: PENDING, currentNode: 0`
- Also create initial `AgentOutput` stubs for nodeIds 1, 2, 3 with `status: LOCKED`
- Add job to BullMQ queue `agentPipeline`: `{ projectId, nodeId: 1, agencyId, concept }`
- Return: `{ projectId, message: 'Pipeline started' }` with status 201

**GET `/api/projects`**
- Query params: `page` (default 1), `limit` (default 20), `agencyId` (required)
- Return paginated list: `{ projects: Project[], total, page, limit }`
- Include `agentOutputs` and `deployment` in each project

**GET `/api/projects/:id`**
- Return full project with all `agentOutputs` and `deployment`
- 404 if not found

**POST `/api/projects/:id/nodes/:nodeId/approve`**
- Validate body with `ApproveNodeSchema`
- Find the latest AgentOutput for this project/node
- If `editedPayload` provided: update `jsonPayload` with it
- Set `status: APPROVED`, `approvedAt: now()`
- Update `Project.currentNode` to `nodeId + 1`
- Queue next job: `{ projectId, nodeId: nodeId + 1, ... previousOutputs }`
- If `nodeId` was 3: queue Shipyard job instead (nodeId: 4)
- Return: `{ success: true }`

**POST `/api/projects/:id/nodes/:nodeId/reject`**
- Validate body with `RejectNodeSchema`
- Check: if `AgentOutput.version >= MAX_REGENERATIONS` (5), return 429 with message "Max regenerations reached"
- Set current AgentOutput `status: FAILED`
- Create NEW AgentOutput with `version: previous + 1`, `status: QUEUED`
- Queue job with `rejectionFeedback` included
- Publish SSE event: `{ type: 'NODE_STATUS', nodeId, status: 'REGENERATING' }`
- Return: `{ success: true, newVersion: n }`

**GET `/api/projects/:id/download`**
- Find Deployment for project
- If `zipPath` doesn't exist: return 404
- Stream the ZIP file as `application/zip` with header `Content-Disposition: attachment; filename="local-stack.zip"`

---

## TASK 3: SSE Route (`apps/api/src/routes/stream.ts`)

This is critical — build it carefully.

```typescript
// GET /api/projects/:id/stream
//
// 1. Set headers:
//    Content-Type: text/event-stream
//    Cache-Control: no-cache
//    Connection: keep-alive
//    X-Accel-Buffering: no  ← prevents nginx buffering
//
// 2. Read Last-Event-ID header for replay support
//    If present: fetch last 20 events from Redis list key `project:${id}:event-log`
//    Write each missed event to response before subscribing
//
// 3. Subscribe to Redis channel: `project:${id}:events`
//    On message: 
//      - Parse JSON
//      - Assign incrementing event ID
//      - Write: `id: ${eventId}\ndata: ${JSON.stringify(event)}\n\n`
//      - Store in Redis list (RPUSH, keep last 50 with LTRIM)
//
// 4. Heartbeat: setInterval every 15s → write `: heartbeat\n\n`
//
// 5. On client disconnect (req.on('close')):
//    - Unsubscribe from Redis channel
//    - Clear heartbeat interval
//    - Log disconnection
//
// 6. Send initial snapshot immediately on connect:
//    Fetch current project from DB
//    Publish: { type: 'NODE_STATUS', nodeId: project.currentNode, status: currentStatus }
```

### Helper: `publishEvent(projectId: string, event: SSEEvent): Promise<void>`
- Create this in `src/lib/pubsub.ts`
- Uses the `redis` (publisher) connection
- `redis.publish(`project:${projectId}:events`, JSON.stringify(event))`
- Also logs to Redis event list for replay
- Export and use this from all workers and routes

---

## TASK 4: BullMQ Pipeline Worker (`apps/api/src/workers/pipeline.worker.ts`)

Build the worker scaffold. Agents are NOT implemented yet — use stubs.

```typescript
import { Worker, Job } from 'bullmq'
import { redis } from '../redis'
import { prisma } from '../prisma'
import { publishEvent } from '../lib/pubsub'
import { NodeStatus } from '@forgeos/shared'

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
    const { projectId, nodeId, concept } = job.data

    // 1. Publish PROCESSING status
    await publishEvent(projectId, { type: 'NODE_STATUS', nodeId, status: NodeStatus.PROCESSING })
    
    // 2. Update DB: set AgentOutput status to PROCESSING
    await prisma.agentOutput.updateMany({
      where: { projectId, nodeId, status: { in: ['QUEUED', 'REGENERATING'] } },
      data: { status: 'PROCESSING' }
    })

    // 3. Route to agent (STUBS FOR NOW — implement in Phase 3)
    let payload: Record<string, unknown>
    switch (nodeId) {
      case 1: payload = await runStrategist(job.data); break
      case 2: payload = await runAnalyst(job.data); break
      case 3: payload = await runTechLead(job.data); break
      case 4: payload = await runShipyard(job.data); break
      default: throw new Error(`Unknown nodeId: ${nodeId}`)
    }

    // 4. Save payload to DB
    const output = await prisma.agentOutput.findFirst({
      where: { projectId, nodeId, status: 'PROCESSING' },
      orderBy: { version: 'desc' }
    })
    await prisma.agentOutput.update({
      where: { id: output!.id },
      data: { jsonPayload: payload, status: 'REVIEW' }
    })
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'AWAITING_REVIEW', currentNode: nodeId }
    })

    // 5. Publish REVIEW with payload
    await publishEvent(projectId, { type: 'NODE_PAYLOAD', nodeId, version: output!.version, payload })
    await publishEvent(projectId, { type: 'NODE_STATUS', nodeId, status: NodeStatus.REVIEW })
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

// Worker error handlers — don't crash on job failure
worker.on('failed', async (job, err) => {
  if (!job) return
  const { projectId, nodeId } = job.data
  console.error(`Job failed for project ${projectId} node ${nodeId}:`, err.message)
  await publishEvent(projectId, { type: 'ERROR', nodeId, message: err.message })
  await prisma.agentOutput.updateMany({
    where: { projectId, nodeId, status: 'PROCESSING' },
    data: { status: 'FAILED' }
  })
})

// STUBS — replace in Phase 3
async function runStrategist(data: PipelineJobData) {
  await new Promise(r => setTimeout(r, 1000)) // simulate work
  return { _stub: true, nodeId: 1, concept: data.concept }
}
async function runAnalyst(data: PipelineJobData) {
  await new Promise(r => setTimeout(r, 1000))
  return { _stub: true, nodeId: 2 }
}
async function runTechLead(data: PipelineJobData) {
  await new Promise(r => setTimeout(r, 1000))
  return { _stub: true, nodeId: 3 }
}
async function runShipyard(data: PipelineJobData) {
  await new Promise(r => setTimeout(r, 1000))
  return { _stub: true, nodeId: 4 }
}

export { worker }
```

**Critical**: Start the worker in `src/index.ts` — import it so it registers on startup.

---

## TASK 5: DO Gradient API Client (`apps/api/src/lib/gradient.ts`)

Build and test this in isolation. It's used by all agents in Phase 3.

```typescript
// Base URL: https://inference.do-ai.run/v1
// Auth: Authorization: Bearer ${process.env.DO_GRADIENT_API_KEY}
// Content-Type: application/json

interface GradientChatOptions {
  systemPrompt: string
  userPrompt: string
  maxTokens?: number        // default 2000
  temperature?: number      // default 0.7
}

interface GradientEmbedOptions {
  texts: string[]           // batch embedding
}

// chat(): calls /chat/completions
//   Model: meta-llama/Meta-Llama-3.1-8B-Instruct
//   streaming: false
//   Returns: raw string content from choices[0].message.content
//   IMPORTANT: Strip markdown fences before returning:
//     content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
//   Retry: 3 attempts with exponential backoff on 429 or 5xx

// embed(): calls /embeddings  
//   Model: BAAI/bge-small-en-v1.5
//   Returns: number[][] (one array per input text, length 768)
//   Normalize vectors before returning (L2 norm)

// parseJSON<T>(rawContent: string): T
//   Strip fences, parse, throw descriptive error if invalid JSON
//   Log raw content on parse failure for debugging

export const gradientClient = { chat, embed, parseJSON }
```

**Write an isolated test** in `apps/api/src/lib/gradient.test.ts`:
- Test `chat()` with a simple "respond with JSON: {test: true}" prompt
- Test `embed()` with 2 strings — verify output shape (2 arrays of 768 numbers)
- Run with: `tsx apps/api/src/lib/gradient.test.ts`

---

## TASK 6: Wire Routes into Express

Update `apps/api/src/index.ts`:
```typescript
import express from 'express'
import cors from 'cors'
import { projectsRouter } from './routes/projects'
import { streamRouter } from './routes/stream'
import { errorHandler } from './middleware/errorHandler'
import './workers/pipeline.worker'  // register worker on startup

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: Date.now() }))
app.use('/api/projects', projectsRouter)
app.use('/api/projects', streamRouter)
app.use(errorHandler)

app.listen(process.env.PORT ?? 3001, () => {
  console.log(`ForgeOS API running on :${process.env.PORT ?? 3001}`)
})
```

---

## PHASE 2 COMPLETION CHECKLIST

Test each of these manually before Phase 3:

- [ ] `POST /api/projects` with valid body → creates DB records, returns projectId
- [ ] `GET /api/projects/:id` → returns project with agent output stubs
- [ ] `GET /api/projects/:id/stream` → SSE connection stays open, heartbeat fires every 15s
- [ ] When POST creates project → SSE client receives NODE_STATUS PROCESSING event within 2s
- [ ] When stub worker completes → SSE client receives NODE_PAYLOAD + NODE_STATUS REVIEW
- [ ] `POST .../approve` → creates next queued job, SSE fires for next node
- [ ] `POST .../reject` → respects MAX_REGENERATIONS=5 limit, returns 429 at attempt 6
- [ ] Error in worker → SSE receives ERROR event, no Express crash
- [ ] `gradient.test.ts` passes against real DO Gradient API

**Verification:**
```bash
# Start services
docker-compose up -d
pnpm dev

# In another terminal — test the full SSE cycle:
curl -N http://localhost:3001/api/projects/YOUR_ID/stream
# In another terminal:
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"concept":"B2B invoicing tool for freelancers","agencyId":"YOUR_AGENCY_ID","mode":"NEW"}'
# Watch SSE terminal receive events ✓
```
