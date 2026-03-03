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

## See CONTEXT.md for full project context
