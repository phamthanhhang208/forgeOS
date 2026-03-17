<div align="center">

# ForgeOS Node Studio

### AI-Agent Software Factory · Built for DigitalOcean

**Input a raw SaaS concept. Watch AI agents analyze, architect, and deploy it — in a real-time visual pipeline with human-in-the-loop control.**

[Live Demo](#demo-mode) · [How It Works](#pipeline-agents) · [Quick Start](#quick-start) · [Architecture](#architecture)

</div>

---

## What It Does

ForgeOS Node Studio is a **multi-agent SaaS incubation platform**. You describe a SaaS idea in plain English, optionally answer AI-generated clarifying questions, and a pipeline of four specialized agents — **Strategist → Business Analyst → Tech Lead → Shipyard** — collaboratively analyzes, architects, and ships a working codebase to GitHub and DigitalOcean App Platform.

Every agent output is visible in a **React Flow canvas**. At each stage you review the AI's JSON output in a rich panel, edit it if needed, then approve or reject with feedback. You are in control at every step.

---

## Pipeline Agents

```
Concept Input → The Strategist → The Business Analyst → The Tech Lead → The Shipyard
    (you)          (market)          (requirements)        (arch)          (deploy)
```

| Node | Agent | Output |
|------|-------|--------|
| 0 | **Concept Input** | Your refined SaaS idea (with optional AI Q&A) |
| 1 | **The Strategist** | Target audience, MVP features (MUST/SHOULD/COULD), monetization, pricing tiers, competitors, risk factors, success metrics |
| 2 | **The Business Analyst** | User personas, user stories (as-a/I-want-to/so-that), data entities, third-party integrations |
| 3 | **The Tech Lead** | Tech stack, Prisma schema delta, API endpoints, Phase 1 & 2 feature roadmap, required env vars |
| 4 | **The Shipyard** | Clone boilerplate → inject schema + routes → push to GitHub → deploy to DO App Platform |

Each node transitions through: `LOCKED → QUEUED → PROCESSING → REVIEW → APPROVED`

---

## Key Features

### Concept Wizard
A 3-step onboarding flow: enter your concept, receive AI-generated clarifying questions (text, select, multiselect), and submit an enriched concept — or skip directly to deploy.

### Human-in-the-Loop (HITL) Review
At `REVIEW` state, a side panel opens with two views:
- **Format view** — rendered cards for features, personas, stories, endpoints, tech stack
- **Raw JSON** — Monaco editor for direct edits before approval

Reject with written feedback to trigger regeneration. Up to 5 regenerations per node, version-tracked.

### Confidence Scores
Each agent outputs a 0–100 self-assessed confidence score based on concept clarity, completeness, and assumptions required. Displayed as a color-coded badge: ≥80 green (High), 50–79 amber (Mid), <50 red (Low).

### Kanban Board
After the Tech Lead is approved, a sprint board auto-populates from Phase 1 (To Do) and Phase 2 (Backlog) features. Drag tickets across five columns: Backlog → To Do → In Progress → Review → Done.

### Export Handoff
Once all three agent nodes are approved, generate a structured handoff document in three formats:
- **CLAUDE.md** — auto-loaded by Claude Code at session start
- **.cursorrules** — auto-loaded by Cursor IDE
- **handoff.md** — generic markdown with all project context

All formats include: strategy, personas, user stories, data entities, Prisma schema, API endpoints, tech stack, and an open task checklist for your AI coding tool.

### Live Console
A collapsible terminal panel streams all agent logs with timestamps and node labels. Error count badge auto-opens the console on failure.

### Agency Settings
Multi-tenant credential management: each agency stores its own GitHub PAT, org, golden boilerplate repo, DigitalOcean API token, and Spaces keys. Settings are masked on retrieval and merged on save.

### Demo Mode
Append `?demo=true` to any URL to run the full pipeline with pre-cached responses — zero external API calls, realistic delays, all animations intact.

---

## Shipyard Deployment Steps

The Shipyard agent runs four idempotent steps tracked with boolean flags in the DB. If the process crashes mid-deploy, it resumes from the last completed step. `/tmp` wipes between deploys are handled automatically by re-running any step whose local files are missing.

| Step | What Happens |
|------|-------------|
| **A — Clone & Inject** | Downloads golden boilerplate at pinned SHA via GitHub API, appends Tech Lead's Prisma schema delta, writes `.env.example`, scaffolds Next.js App Router route stubs from the API endpoint list |
| **B — Push to GitHub** | Creates a new GitHub repo (or feature branch in ITERATE mode), pushes all files via GitHub's Git Data API (no `git` binary required), triggers async ZIP export |
| **C — Create DO App** | Calls DO App Platform API to create a new app linked to the GitHub repo |
| **D — Poll for Active** | Polls DO until build status is `ACTIVE`, records the live URL, uploads a project summary to DO Spaces for Knowledge Base indexing |

---

## DigitalOcean Services

| Service | Usage |
|---------|-------|
| **DO Gradient API** | LLaMA 3.1 8B Instruct for all AI agent reasoning (Strategist, Analyst, Tech Lead, concept clarification) |
| **DO Gradient Knowledge Base** | RAG retrieval — past project summaries used as context for the Strategist |
| **DO Managed PostgreSQL** | All project, agent output, and deployment state |
| **DO Managed Valkey (Redis)** | BullMQ job queue + Redis pub/sub for real-time SSE events |
| **DO App Platform** | Hosts this application + auto-deploys generated projects from GitHub |
| **DO Spaces** | S3-compatible storage for agency memory files (Knowledge Base source documents) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, `@xyflow/react` v12, Zustand, TanStack Query v5, Framer Motion, Tailwind CSS |
| Backend | Express, TypeScript, Prisma ORM 7, BullMQ, IORedis |
| Database | PostgreSQL (Prisma with `@prisma/adapter-pg`, SSL) |
| Queue | Redis/Valkey + BullMQ (`agentPipeline` queue, TLS) |
| AI | DO Gradient API (`meta-llama/Meta-Llama-3.1-8B-Instruct` at `https://inference.do-ai.run/v1`) |
| Real-time | Server-Sent Events (SSE) via Redis pub/sub, 15s heartbeat, last-20-event replay |
| Monorepo | pnpm workspaces + Turborepo |

---

## Quick Start

**Prerequisites**: Node.js 22+, pnpm, Docker

```bash
# 1. Clone and install
git clone https://github.com/phamthanhhang208/forgeOS.git
cd forgeOS
pnpm install

# 2. Start Postgres + Redis
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Fill in: DO_GRADIENT_API_KEY, GITHUB_TOKEN, GITHUB_ORG,
#          GOLDEN_BOILERPLATE_REPO, GOLDEN_BOILERPLATE_SHA,
#          DO_API_TOKEN, DO_SPACES_KEY, DO_SPACES_SECRET, etc.

# 4. Run database migrations
pnpm db:migrate

# 5. Seed agency memory (optional — uploads demo docs to DO Spaces for KB)
pnpm seed

# 6. Start all services
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) — or append `?demo=true` for demo mode.

---

## Architecture

```
apps/
  api/                  Express API (port 3001)
    src/
      routes/           REST endpoints + SSE stream
      workers/
        pipeline.worker.ts   BullMQ worker (job router)
        agents/
          strategist.ts      Node 1 — market analysis
          analyst.ts         Node 2 — requirements & data model
          techlead.ts        Node 3 — architecture & schema
          shipyard.ts        Node 4 — clone, inject, push, deploy
      lib/
        gradient.ts     DO Gradient API client (LLM + KB)
        github.ts       Octokit-based GitHub client (no git binary)
        doClient.ts     DO App Platform API client
        pubsub.ts       Redis SSE pub/sub
        archiver.ts     Local ZIP export
  web/                  Vite + React (port 5173)
    src/
      components/
        canvas/         PipelineCanvas (ReactFlow)
        nodes/          InputNode, AgentNode, ShipyardNode
        edges/          AnimatedEdge
        panels/         HITLPanel, ConsolePanel
        modals/         ConceptWizard, KanbanModal, ExportModal,
                        SettingsModal, ConceptDetailModal
      store/            Zustand pipeline state (pipeline.store.ts)
      hooks/            useSSE (EventSource connection + reconnect)
      pages/            Dashboard, Studio
packages/
  shared/               TypeScript types, enums, Zod schemas, SSE event types
prisma/
  schema.prisma         DB schema (Agency, Project, AgentOutput, Deployment)
  migrations/           Prisma migration history
```

---

## Design Decisions

**SSE over WebSocket** — Simpler, stateless, works through proxies. One `EventSource` per project with last-20-event replay on reconnect.

**BullMQ over in-process** — Long-running agent calls (10–30s) don't block the Express event loop. Jobs survive server restarts and support retry with exponential backoff.

**GitHub API over git CLI** — DO App Platform containers have no `git` binary. All git operations (clone, push, branch, PR) use Octokit's REST and Git Data APIs directly.

**Idempotent Shipyard steps** — Each step (A–D) tracked with a boolean flag in the DB. Crashes resume from the last completed step. `/tmp` wipes trigger automatic re-execution of local-file-dependent steps.

**JSON-only agents** — Every agent outputs strict JSON. The HITL panel lets you edit it before approval — no black boxes, no irreversible AI decisions.

**Demo mode** — `?demo=true` bypasses all external APIs with pre-cached fixture responses, making live demos 100% reliable.

---

Built for the [DigitalOcean App Platform Hackathon 2025](https://dev.to/challenges/digitalocean).
