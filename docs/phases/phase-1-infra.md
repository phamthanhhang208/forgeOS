# ForgeOS Node Studio — PHASE 1: Infrastructure & Foundation
# DigitalOcean Hackathon

---

## WHAT YOU'RE BUILDING
ForgeOS Node Studio is a multi-agent SaaS incubation platform. A user inputs a raw SaaS idea → AI pipeline of specialized agents → auto-deploys a boilerplate repo to DigitalOcean via GitHub.

**Your job in Phase 1**: Scaffold the entire monorepo skeleton, shared types, database schema, Docker local dev environment, and verify all infrastructure connections are alive. Nothing should be built on a broken foundation.

---

## MCP SERVERS ACTIVE
You have these MCP servers available — use them:
- **digitalocean** → verify your DO account token is working; check available regions; in Phase 5 this handles ALL App Platform operations
- **prisma** → run all migrations via MCP, don't use terminal manually
- **context7** → use for @xyflow/react, BullMQ, Prisma, ioredis docs when writing code
- **postgres** → verify DB state after migrations

---

## MONOREPO TO SCAFFOLD

```
forgeos/
├── apps/
│   ├── web/                    # Vite + React 18 + TypeScript (scaffold only, no components yet)
│   └── api/                    # Express + TypeScript (scaffold only, no routes yet)
├── packages/
│   └── shared/                 # Shared TypeScript types, Zod schemas, enums ← BUILD THIS FULLY
├── prisma/
│   └── schema.prisma           # Full schema ← BUILD THIS FULLY
├── scripts/
│   ├── seed-agency-memory.ts   # Stub only — implement in Phase 3
│   └── demo-cache.ts           # Stub only — implement in Phase 6
├── docker-compose.yml          # Postgres + Redis for local dev ← BUILD THIS FULLY
├── .mcp.json                   # MCP server config ← BUILD THIS FULLY
├── .env.example                # All env vars documented ← BUILD THIS FULLY
├── CLAUDE.md                   # Project context for future Claude Code sessions ← BUILD THIS FULLY
└── package.json                # pnpm workspace root ← BUILD THIS FULLY
```

Use **pnpm workspaces**. TypeScript strict mode everywhere. No `any` types.

---

## TASK 1: pnpm Workspace Root

`package.json`:
```json
{
  "name": "forgeos",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "seed": "tsx scripts/seed-agency-memory.ts",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "prisma": "^5.13.0"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

`turbo.json`: configure dev, build, typecheck pipelines with correct dependencies.

---

## TASK 2: `packages/shared` — Complete Type System

This package is the single source of truth for all types. Both `apps/api` and `apps/web` import from here.

### Directory:
```
packages/shared/
├── src/
│   ├── index.ts          # Re-export everything
│   ├── enums.ts          # All enums
│   ├── types.ts          # All TypeScript interfaces
│   ├── schemas.ts        # All Zod schemas (request validation + API response shapes)
│   └── sse.ts            # SSE event type union
└── package.json
```

### `enums.ts` — define all of these exactly:
```typescript
export enum ProjectMode { NEW = 'NEW', ITERATE = 'ITERATE' }

export enum ProjectStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  AWAITING_REVIEW = 'AWAITING_REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum NodeStatus {
  LOCKED = 'LOCKED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  FAILED = 'FAILED',
  REGENERATING = 'REGENERATING'
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  CLONING = 'CLONING',
  PUSHING = 'PUSHING',
  DEPLOYING = 'DEPLOYING',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED'
}

export const NODE_LABELS: Record<number, string> = {
  0: 'Concept Input',
  1: 'The Strategist',
  2: 'The Business Analyst',
  3: 'The Tech Lead',
  4: 'The Shipyard'
}

export const MAX_REGENERATIONS = 5
```

### `types.ts` — full TypeScript interfaces for all DB models + frontend state:
```typescript
// DB model shapes (what API returns)
export interface Agency { id: string; name: string; createdAt: string }

export interface AgentOutput {
  id: string; projectId: string; nodeId: number; version: number;
  jsonPayload: Record<string, unknown>; status: NodeStatus;
  rejectedReason?: string; approvedAt?: string; createdAt: string;
}

export interface Deployment {
  id: string; projectId: string;
  githubRepoUrl?: string; doAppId?: string; doAppUrl?: string;
  buildStatus: DeploymentStatus;
  stepADone: boolean; stepBDone: boolean; stepCDone: boolean; stepDDone: boolean;
  zipPath?: string; createdAt: string; updatedAt: string;
}

export interface Project {
  id: string; agencyId: string; concept: string;
  mode: ProjectMode; status: ProjectStatus;
  currentNode: number; iterationCount: number;
  createdAt: string; updatedAt: string;
  agentOutputs: AgentOutput[];
  deployment?: Deployment;
}

// Frontend pipeline node state
export interface PipelineNodeState {
  id: number;
  label: string;
  status: NodeStatus;
  payload: Record<string, unknown> | null;
  version: number;
  regenerationCount: number;
}
```

### `schemas.ts` — Zod schemas for all API request/response shapes:
```typescript
import { z } from 'zod'

export const CreateProjectSchema = z.object({
  concept: z.string().min(10, 'Concept must be at least 10 characters').max(500),
  agencyId: z.string().cuid(),
  mode: z.enum(['NEW', 'ITERATE']).default('NEW'),
})

export const ApproveNodeSchema = z.object({
  editedPayload: z.record(z.unknown()).optional(),
})

export const RejectNodeSchema = z.object({
  feedback: z.string().min(5, 'Feedback must be at least 5 characters').max(1000),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>
export type ApproveNodeInput = z.infer<typeof ApproveNodeSchema>
export type RejectNodeInput = z.infer<typeof RejectNodeSchema>
```

### `sse.ts` — SSE event union type (used by both API publisher and frontend consumer):
```typescript
import { NodeStatus, DeploymentStatus } from './enums'

export type SSEEvent =
  | { type: 'NODE_STATUS'; nodeId: number; status: NodeStatus }
  | { type: 'NODE_PAYLOAD'; nodeId: number; version: number; payload: Record<string, unknown> }
  | { type: 'SHIPYARD_STEP'; step: 'A' | 'B' | 'C' | 'D'; status: 'START' | 'DONE' | 'FAILED' }
  | { type: 'DEPLOYMENT_COMPLETE'; githubUrl: string; doAppUrl: string; zipReady: boolean }
  | { type: 'ERROR'; nodeId: number; message: string }
  | { type: 'HEARTBEAT' }
```

---

## TASK 3: Prisma Schema + Migration

Create `prisma/schema.prisma` exactly as follows:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

model Agency {
  id        String         @id @default(cuid())
  name      String
  createdAt DateTime       @default(now())
  projects  Project[]
  memories  AgencyMemory[]
}

model Project {
  id             String        @id @default(cuid())
  agencyId       String
  agency         Agency        @relation(fields: [agencyId], references: [id])
  concept        String
  mode           ProjectMode   @default(NEW)
  status         ProjectStatus @default(PENDING)
  currentNode    Int           @default(0)
  iterationCount Int           @default(0)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  agentOutputs   AgentOutput[]
  deployment     Deployment?
}

enum ProjectMode   { NEW ITERATE }
enum ProjectStatus { PENDING RUNNING AWAITING_REVIEW COMPLETED FAILED }

model AgentOutput {
  id             String     @id @default(cuid())
  projectId      String
  project        Project    @relation(fields: [projectId], references: [id])
  nodeId         Int
  version        Int        @default(1)
  jsonPayload    Json
  status         NodeStatus @default(PENDING)
  rejectedReason String?
  approvedAt     DateTime?
  createdAt      DateTime   @default(now())
}

enum NodeStatus { LOCKED QUEUED PROCESSING REVIEW APPROVED FAILED REGENERATING }

model Deployment {
  id            String           @id @default(cuid())
  projectId     String           @unique
  project       Project          @relation(fields: [projectId], references: [id])
  githubRepoUrl String?
  doAppId       String?
  doAppUrl      String?
  buildStatus   DeploymentStatus @default(PENDING)
  stepADone     Boolean          @default(false)
  stepBDone     Boolean          @default(false)
  stepCDone     Boolean          @default(false)
  stepDDone     Boolean          @default(false)
  zipPath       String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}

enum DeploymentStatus { PENDING CLONING PUSHING DEPLOYING ACTIVE FAILED }

model AgencyMemory {
  id             String                      @id @default(cuid())
  agencyId       String
  agency         Agency                      @relation(fields: [agencyId], references: [id])
  projectSummary String
  tags           String[]
  embedding      Unsupported("vector(768)")?
  createdAt      DateTime                    @default(now())
}
```

**After creating the schema:**
1. Use the **prisma MCP** to run the initial migration: name it `init`
2. Use the **postgres MCP** to verify all tables were created and pgvector extension is active
3. Run `prisma generate` to create the client

---

## TASK 4: Docker Compose (Local Dev)

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: ankane/pgvector:latest
    environment:
      POSTGRES_DB: forgeos_dev
      POSTGRES_USER: forgeos
      POSTGRES_PASSWORD: forgeos_dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## TASK 5: App Scaffolds (Skeleton Only)

### `apps/api` — skeleton, no logic yet:
```
apps/api/
├── src/
│   ├── index.ts         # Express app: health check GET /health only
│   ├── prisma.ts        # Prisma singleton
│   └── redis.ts         # IORedis singleton (two connections: pub + sub)
├── tsconfig.json
└── package.json
```

`src/index.ts` should only have:
- Express app setup
- CORS configured for FRONTEND_URL
- `GET /health` returning `{ status: 'ok', timestamp: Date.now() }`
- Server listening on PORT

`src/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

`src/redis.ts`:
```typescript
import { Redis } from 'ioredis'
export const redis = new Redis(process.env.REDIS_URL!, { lazyConnect: true })
export const redisSub = new Redis(process.env.REDIS_URL!, { lazyConnect: true })
// Connect both on startup, log errors but don't crash
```

### `apps/web` — scaffold only:
```
apps/web/
├── src/
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Single <div>ForgeOS loading...</div> placeholder
│   └── index.css        # Import Tailwind directives only
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## TASK 6: `.mcp.json` (Project Root)

```json
{
  "mcpServers": {
    "digitalocean": {
      "command": "npx",
      "args": ["-y", "@digitalocean/mcp"],
      "env": {
        "DIGITALOCEAN_API_TOKEN": "${DO_API_TOKEN}"
      }
    },
    "prisma": {
      "command": "npx",
      "args": ["-y", "prisma", "mcp"]
    },
    "shadcn": {
      "type": "http",
      "url": "https://www.shadcn.io/api/mcp"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp", "--api-key", "${CONTEXT7_API_KEY}"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}" }
    }
  }
}
```

> **Note on DO MCP**: The `digitalocean` MCP server gives the AI direct access to App Platform, Databases, Droplets, Spaces, and more via natural language. In Phase 5, the AI should use this MCP to create DO Apps, check build logs, and poll deployment status — rather than writing raw fetch wrappers.
```

---

## TASK 7: `.env.example`

```env
# Database (DO Managed PostgreSQL or local docker)
DATABASE_URL=postgresql://forgeos:forgeos_dev_password@localhost:5432/forgeos_dev

# Redis (DO Managed Redis or local docker)
REDIS_URL=redis://localhost:6379

# DigitalOcean
DO_GRADIENT_API_KEY=           # From DO console → AI/ML → API Keys
DO_API_TOKEN=                  # From DO console → API → Personal Access Tokens

# GitHub
GITHUB_TOKEN=                  # PAT with repo + workflow scopes
GITHUB_ORG=                    # Your GitHub username or org

# Golden Boilerplate (keep this repo private)
GOLDEN_BOILERPLATE_REPO=       # e.g. your-org/forgeos-boilerplate
GOLDEN_BOILERPLATE_SHA=        # Pinned commit SHA for reproducibility

# App
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Demo
DEMO_AGENCY_ID=demo-agency-cuid  # Must match what seed script creates

# MCP
CONTEXT7_API_KEY=              # From context7.com/dashboard (free)
```

---

## TASK 8: `CLAUDE.md` (Project Context File)

This file is auto-read by Claude Code on every session. Write it to give full project context:

```markdown
# ForgeOS Node Studio

## What This Is
Multi-agent SaaS incubation platform for the DigitalOcean hackathon.
Input: raw SaaS concept → Output: deployed boilerplate on DO App Platform via GitHub.

## Stack
- Frontend: Vite + React 18 + TypeScript + @xyflow/react v12 + Zustand + TanStack Query v5
- Backend: Express + TypeScript + Prisma + BullMQ + IORedis
- DB: PostgreSQL + pgvector (768-dim embeddings via BAAI/bge-small-en-v1.5)
- Queue: Redis + BullMQ (queue name: 'agentPipeline')  
- AI: DO Gradient API (meta-llama/Meta-Llama-3.1-8B-Instruct) at https://inference.do-ai.run/v1
- Deploy: DO App Platform API

## Pipeline Nodes
- Node 0: Concept Input (user entry)
- Node 1: Strategist (market analysis → JSON)
- Node 2: Business Analyst (requirements → JSON)
- Node 3: Tech Lead (architecture + Prisma schema → JSON)
- Node 4: Shipyard (clone boilerplate → push GitHub → deploy DO)

## Key Patterns
- All agents MUST output JSON only — strip markdown fences before JSON.parse()
- NodeStatus enum: LOCKED → QUEUED → PROCESSING → REVIEW → APPROVED/FAILED/REGENERATING
- SSE channel per project: `project:${id}:events` (Redis pub/sub)
- Max 5 regenerations per node (check AgentOutput version count before queuing)
- Demo mode: ?demo=true skips all external API calls

## Packages
- Shared types: packages/shared (import as @forgeos/shared)
- API: apps/api (port 3001)
- Web: apps/web (port 5173)

## Commands
- pnpm dev → starts all apps
- pnpm seed → seeds pgvector with 5 demo agency memories
- pnpm db:migrate → runs prisma migrate dev
- docker-compose up → starts local Postgres + Redis
```

---

## PHASE 1 COMPLETION CHECKLIST

Do not proceed to Phase 2 until all of these pass:

- [ ] `docker-compose up` starts Postgres and Redis cleanly
- [ ] `pnpm db:migrate` applies migration with no errors (verify via prisma MCP)
- [ ] `prisma generate` produces client with all models
- [ ] postgres MCP confirms: all 5 tables exist + vector extension enabled
- [ ] `packages/shared` compiles with zero TypeScript errors
- [ ] `apps/api` starts and `GET /health` returns 200
- [ ] `apps/web` starts and renders placeholder without errors
- [ ] `.env.example` has every variable the codebase references
- [ ] `CLAUDE.md` exists at project root

**Verification command to run at the end:**
```bash
pnpm typecheck && echo "✅ Phase 1 complete"
```
