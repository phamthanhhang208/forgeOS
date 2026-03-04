<br/>

<div align="center">

# ForgeOS Node Studio

### AI-Agent Software Factory for DigitalOcean

**Input a raw SaaS concept. Watch AI agents analyze, architect, and deploy it — all in a real-time visual pipeline.**

[Live Demo](#demo) · [How It Works](#how-it-works) · [Quick Start](#quick-start) · [Architecture](#architecture)

</div>

---

## What It Does

ForgeOS Node Studio is a **multi-agent SaaS incubation platform** that transforms a raw business idea into a deployed web application on DigitalOcean App Platform. You describe a SaaS concept in plain English, and a pipeline of specialized AI agents — Strategist, Business Analyst, Tech Lead, and Shipyard — collaboratively analyzes, architects, and ships a working codebase.

Every agent output is visible in a **React Flow canvas** where you can review, edit, or reject JSON outputs before the pipeline advances. This human-in-the-loop design ensures the AI never goes off the rails — you stay in control at every step.

## Demo

Open the app with `?demo=true` to run with pre-cached AI responses (zero external API calls):

```
http://localhost:5173?demo=true
```

The demo banner confirms you're in demo mode. All 4 agent nodes use fixture data with realistic delays so you can experience the full pipeline flow in ~30 seconds.

## How It Works

```
Concept Input → Strategist → Business Analyst → Tech Lead → Shipyard
     (you)      (market)      (requirements)    (arch)     (deploy)
```

| Node | Agent | What It Produces |
|------|-------|-----------------|
| 0 | **Concept Input** | Your raw SaaS idea |
| 1 | **The Strategist** | Target audience, MVP features, monetization, risks |
| 2 | **The Business Analyst** | User personas, stories, data entities, integrations |
| 3 | **The Tech Lead** | Tech stack, Prisma schema, API endpoints, feature roadmap |
| 4 | **The Shipyard** | Clones boilerplate → injects schema → pushes to GitHub → deploys to DO App Platform |

Each node transitions through: `LOCKED → QUEUED → PROCESSING → REVIEW → APPROVED`

At **REVIEW**, you can:
- View and edit the agent's JSON output in a Monaco editor
- Approve to advance the pipeline
- Reject with feedback to regenerate (up to 5 attempts per node)

## DigitalOcean Services Used

| Service | Usage |
|---------|-------|
| **DO Gradient API** | LLaMA 3.1 8B Instruct for all AI agent reasoning |
| **DO Managed PostgreSQL** | Project, agent output, and deployment state storage |
| **DO Managed Redis** | BullMQ job queue + SSE pub/sub for real-time events |
| **DO App Platform** | Auto-deploys generated projects from GitHub |
| **DO Spaces** | S3-compatible storage for agency memory (Knowledge Base source) |
| **DO Gradient Knowledge Base** | RAG retrieval for past project context |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, @xyflow/react v12, Zustand, TanStack Query v5, Framer Motion, Tailwind CSS |
| Backend | Express, TypeScript, Prisma ORM, BullMQ, IORedis |
| Database | PostgreSQL (via Prisma) |
| Queue | Redis + BullMQ (`agentPipeline` queue) |
| AI | DO Gradient API (meta-llama/Meta-Llama-3.1-8B-Instruct) |
| Real-time | Server-Sent Events (SSE) via Redis pub/sub |
| Monorepo | pnpm workspaces + Turborepo |

## Quick Start

**Prerequisites**: Node.js 22+, pnpm, Docker

```bash
# 1. Clone and install
git clone https://github.com/phamthanhhang208/forgeos-1.git
cd forgeos-1
pnpm install

# 2. Start Postgres + Redis
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Fill in your DO API keys, GitHub PAT, etc.

# 4. Run database migrations
pnpm db:migrate

# 5. Seed agency memory (uploads to DO Spaces for KB)
pnpm seed

# 6. Start all services
pnpm dev
```

Open http://localhost:5173 (or http://localhost:5173?demo=true for demo mode).

## Architecture

```
apps/
  api/           Express API server (port 3001)
    src/
      routes/      REST endpoints + SSE stream
      workers/     BullMQ pipeline worker
        agents/    Strategist, Analyst, TechLead, Shipyard
      lib/         Gradient client, GitHub client, DO client, RAG
  web/           Vite + React frontend (port 5173)
    src/
      components/  Canvas, Nodes, Edges, Panels
      store/       Zustand pipeline state
      hooks/       SSE connection hook
packages/
  shared/        TypeScript types, enums, Zod schemas, SSE event types
prisma/          Database schema + migrations
```

## Key Design Decisions

- **SSE over WebSocket**: Simpler, stateless, works through proxies. One EventSource per project.
- **BullMQ over in-process**: Long-running agent calls (10-30s) don't block the Express event loop. Jobs survive server restarts.
- **JSON-only agents**: Every AI agent outputs structured JSON. The HITL panel lets you edit before approval — no black boxes.
- **Idempotent Shipyard steps**: Each deployment step (A-D) is tracked with boolean flags. If the process crashes mid-deploy, it resumes from the last completed step.
- **Demo mode**: `?demo=true` bypasses all external APIs with pre-cached responses, making the demo 100% reliable for judges.

---

Built for the DigitalOcean App Platform Hackathon 2025.
