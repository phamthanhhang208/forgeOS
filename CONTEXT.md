# ForgeOS Node Studio — AI Assistant Context

# Read this file at the start of every session before touching any code.

---

## WHAT THIS PROJECT IS

**ForgeOS Node Studio** is a multi-agent SaaS incubation platform built for the **DigitalOcean Hackathon**.

The core idea: a digital agency inputs a raw SaaS concept (e.g. "Client portal for a law firm") and the platform automatically runs it through a pipeline of 4 specialized AI agents, then deploys a production-ready boilerplate repository to DigitalOcean via GitHub — all without writing a single line of code.

**The magic**: instead of hallucinating full codebases, the system injects AI-generated architectures (Prisma schema, env vars, feature plans) into a maintained "Golden Boilerplate" (Next.js + Prisma) and ships it live.

---

## MCP SERVERS — AVAILABLE IN `.mcp.json`

**There is a `.mcp.json` file in the project root.** It configures MCP servers that you MUST use when relevant. Do not ignore these — they give you live access to the actual tools instead of guessing from training data.

```
.mcp.json location: <project-root>/.mcp.json
```

### Available MCP Servers:

| Server         | What It Does                                                                                                                                       | When To Use                                                                                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `digitalocean` | **Direct DO API access** — deploy apps, manage databases, check build logs, create/manage App Platform instances, query Managed PostgreSQL + Redis | **Phase 5 Shipyard**: creating DO Apps, polling build status, fetching logs. Also for verifying DB and Redis connections during dev. Replaces manual DO API calls in `lib/digitalocean.ts` |
| `prisma`       | Run `migrate-dev`, `migrate-status`, `migrate-reset` against the local DB                                                                          | Any time you touch schema.prisma or need to check migration state                                                                                                                          |
| `shadcn`       | Live shadcn/ui component registry — real props, no hallucinations                                                                                  | Any time you add a shadcn component to the frontend                                                                                                                                        |
| `context7`     | Up-to-date docs for every library in this stack                                                                                                    | Always use for @xyflow/react v12, BullMQ, TanStack Query v5, Framer Motion, Prisma raw queries                                                                                             |
| `github`       | Create repos, open PRs, manage branches                                                                                                            | When testing/building the Shipyard's GitHub integration                                                                                                                                    |
| `postgres`     | Query the local dev database directly                                                                                                              | Verifying DB state after migrations, seeding, or agent runs                                                                                                                                |

### DigitalOcean MCP — Services Available:

The DO MCP covers **9 services** via remote endpoints (no local install needed):

- **App Platform** → `https://apps.mcp.digitalocean.com/mcp` — deploy, update, restart, get logs, manage env vars
- **Databases** → manage Managed PostgreSQL + Redis clusters, users, backups
- **Droplets** → create/manage VMs (not needed for this project but available)
- **Spaces** → object storage (useful for storing user-uploaded files in future)
- **Accounts**, **DOKS**, **Insights**, **Marketplace**, **Networking** — also available

### How to add DO MCP (Claude Code):

```bash
claude mcp add digitalocean \
  --env DIGITALOCEAN_API_TOKEN=${DO_API_TOKEN} \
  -- npx -y "@digitalocean/mcp"
```

### Or via remote HTTP (no local install):

```json
{
  "digitalocean-apps": {
    "type": "http",
    "url": "https://apps.mcp.digitalocean.com/mcp",
    "headers": { "Authorization": "Bearer ${DO_API_TOKEN}" }
  },
  "digitalocean-databases": {
    "type": "http",
    "url": "https://databases.mcp.digitalocean.com/mcp",
    "headers": { "Authorization": "Bearer ${DO_API_TOKEN}" }
  }
}
```

### How to activate:

If you're in Claude Code: MCP servers in `.mcp.json` are auto-loaded. Run `/mcp` to verify they're connected.
If you're in Cursor / Windsurf / other: check your MCP settings panel and add from `.mcp.json`.

**Always prefer MCP tools over guessing.** Examples:

- Need to create a DO App? → use `digitalocean` MCP, not raw `fetch` to DO API
- Need current shadcn Button props? → use `shadcn` MCP
- Need to check migration status? → use `prisma` MCP
- Need @xyflow/react v12 API? → use `context7` MCP

---

## MONOREPO STRUCTURE

```
forgeos/
├── apps/
│   ├── web/                    # Vite + React 18 + TypeScript — frontend
│   └── api/                    # Express + TypeScript — backend
├── packages/
│   └── shared/                 # @forgeos/shared — types, enums, Zod schemas, SSE events
├── prisma/
│   └── schema.prisma           # Main DB schema (PostgreSQL + pgvector)
├── scripts/
│   ├── seed-agency-memory.ts   # Seeds 5 demo projects into pgvector
│   └── demo-cache.ts           # Pre-cached AI responses for ?demo=true mode
├── docker-compose.yml          # Local dev: PostgreSQL (pgvector) + Redis
├── .mcp.json                   # ← MCP server config — USE THIS
├── .env.example                # All required env vars documented
├── CLAUDE.md                   # ← This file
└── package.json                # pnpm workspace root
```

### Package manager: **pnpm workspaces**

### TypeScript: **strict mode, zero `any` types**

### Import shared package as: `@forgeos/shared`

---

## TECH STACK

### Frontend (`apps/web`)

| Package                 | Version | Purpose                          |
| ----------------------- | ------- | -------------------------------- |
| Vite                    | latest  | Build tool                       |
| React                   | 18      | UI framework                     |
| TypeScript              | ^5.4    | Type safety                      |
| `@xyflow/react`         | v12     | Pipeline canvas (nodal UI)       |
| `zustand`               | latest  | Pipeline UI state                |
| `@tanstack/react-query` | v5      | Server state + API calls         |
| `@monaco-editor/react`  | latest  | JSON editor in HITL panels       |
| `tailwindcss`           | latest  | Styling                          |
| `tailwind-animate`      | latest  | CSS animations                   |
| `framer-motion`         | latest  | Node state transition animations |
| `lucide-react`          | latest  | Icons                            |
| `sonner`                | latest  | Toast notifications              |
| shadcn/ui               | latest  | UI components (use shadcn MCP)   |

### Backend (`apps/api`)

| Package          | Version | Purpose            |
| ---------------- | ------- | ------------------ |
| Express          | latest  | HTTP server        |
| TypeScript       | ^5.4    | Type safety        |
| `@prisma/client` | ^5.13   | DB ORM             |
| `bullmq`         | latest  | Job queue          |
| `ioredis`        | latest  | Redis client       |
| `zod`            | latest  | Request validation |
| `@octokit/rest`  | latest  | GitHub API         |
| `archiver`       | latest  | ZIP file creation  |

### Infrastructure (DigitalOcean)

| Service               | Usage                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| DO Gradient API       | LLM: `meta-llama/Meta-Llama-3.1-8B-Instruct` + Embeddings: `BAAI/bge-small-en-v1.5` (768-dim) |
| DO Managed PostgreSQL | Main DB + pgvector extension for RAG                                                          |
| DO Managed Redis      | BullMQ job queue + SSE pub/sub                                                                |
| DO App Platform       | Deployment target for generated user apps                                                     |

---

## THE PIPELINE — 5 NODES

```
Node 0        Node 1          Node 2              Node 3          Node 4
──────        ──────          ──────              ──────          ──────
Concept   →  Strategist   →  Business Analyst →  Tech Lead   →  Shipyard
Input         (LLM)           (LLM)               (LLM)          (DevOps)
              HITL ✋         HITL ✋              HITL ✋         Auto 🤖
```

### Node 0: Concept Input

- User enters raw concept, clicks "Deploy to Pipeline"
- Creates `Project` DB record, queues first BullMQ job

### Node 1: The Strategist

- **LLM**: Queries pgvector for similar past projects (RAG), calls Gradient/Llama
- **Output JSON**: `{ targetAudience, audienceSegments, mvpFeatures[], monetizationStrategy, marketDifferentiators[], riskFactors[] }`
- **HITL**: User reviews, edits JSON, approves or rejects with feedback (max 5 regenerations)

### Node 2: The Business Analyst

- **LLM**: Takes approved Strategist output as input
- **Output JSON**: `{ userPersonas[], coreUserStories[], dataEntities[], integrations[] }`
- **HITL**: User reviews entity names, user stories, approves

### Node 3: The Tech Lead

- **LLM**: Takes all previous approved outputs
- **Output JSON**: `{ techStack{}, prismaSchemaDelta (valid Prisma syntax), phase1Features[], phase2Features[], apiEndpoints[], envVarsRequired[] }`
- **HITL**: User reviews DB schema and sprint plan before code generation begins

### Node 4: The Shipyard (NO LLM — pure DevOps)

- **Step A**: Clone golden boilerplate at pinned SHA, overwrite `schema.prisma`, write `.env.example`
- **Step B**: Create new GitHub repo via Octokit, push injected code
- **Step C**: Create DO App Platform instance via DO API, linked to new GitHub repo
- **Step D**: Poll DO API for build status (max 20 polls × 15s), emit DEPLOYMENT_COMPLETE SSE event
- **Output**: Live `ondigitalocean.app` URL + GitHub repo URL + downloadable ZIP

---

## DATABASE MODELS (Prisma)

```
Agency          — multi-tenant owner of projects + memories
Project         — one SaaS idea, tracks pipeline progress
AgentOutput     — versioned JSON output per node (supports regeneration history)
Deployment      — tracks Shipyard step completion + URLs
AgencyMemory    — pgvector embeddings of past projects for RAG
```

### Key enums:

```typescript
ProjectMode: NEW | ITERATE;
ProjectStatus: PENDING | RUNNING | AWAITING_REVIEW | COMPLETED | FAILED;
NodeStatus: LOCKED |
  QUEUED |
  PROCESSING |
  REVIEW |
  APPROVED |
  FAILED |
  REGENERATING;
DeploymentStatus: PENDING | CLONING | PUSHING | DEPLOYING | ACTIVE | FAILED;
```

---

## REAL-TIME ARCHITECTURE

### SSE Flow:

```
BullMQ Worker → publishEvent() → Redis PUBLISH → SSE Route subscriber → EventSource (frontend) → Zustand store → React re-render
```

### SSE Event Types:

```typescript
| { type: 'NODE_STATUS';         nodeId: number; status: NodeStatus }
| { type: 'NODE_PAYLOAD';        nodeId: number; version: number; payload: object }
| { type: 'SHIPYARD_STEP';       step: 'A'|'B'|'C'|'D'; status: 'START'|'DONE'|'FAILED' }
| { type: 'DEPLOYMENT_COMPLETE'; githubUrl: string; doAppUrl: string; zipReady: boolean }
| { type: 'ERROR';               nodeId: number; message: string }
```

### Redis channels:

- Per-project events: `project:${id}:events`
- Event replay list: `project:${id}:event-log` (last 50 events)

### BullMQ:

- Queue name: `agentPipeline`
- Job data: `{ projectId, nodeId, agencyId, concept, previousOutputs, rejectionFeedback?, demoMode? }`
- Max attempts: 3, backoff: exponential

---

## API ROUTES

```
POST   /api/projects                              Create project, start pipeline
GET    /api/projects?agencyId=&page=              List projects (paginated)
GET    /api/projects/:id                          Get project with all outputs
GET    /api/projects/:id/stream                   SSE stream (text/event-stream)
POST   /api/projects/:id/nodes/:nodeId/approve    Approve node (with optional edited JSON)
POST   /api/projects/:id/nodes/:nodeId/reject     Reject with feedback, re-queue agent
GET    /api/projects/:id/download                 Stream ZIP of local stack
POST   /api/projects/:id/iterate                  Day 2: expand existing app
```

---

## ENVIRONMENT VARIABLES

```env
DATABASE_URL=postgresql://forgeos:forgeos_dev_password@localhost:5432/forgeos_dev
REDIS_URL=redis://localhost:6379
DO_GRADIENT_API_KEY=          # DO console → AI/ML → API Keys
DO_API_TOKEN=                  # DO console → API → Personal Access Tokens
GITHUB_TOKEN=                  # PAT with repo + workflow scopes
GITHUB_ORG=                    # GitHub username or org
GOLDEN_BOILERPLATE_REPO=       # e.g. your-org/forgeos-boilerplate (private)
GOLDEN_BOILERPLATE_SHA=        # Pinned commit SHA
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
DEMO_AGENCY_ID=demo-agency-cuid
CONTEXT7_API_KEY=              # context7.com/dashboard (free)
```

---

## DO GRADIENT API — IMPORTANT DETAILS

- **Base URL**: `https://inference.do-ai.run/v1`
- **Auth**: `Authorization: Bearer ${DO_GRADIENT_API_KEY}`
- **Generation model**: `meta-llama/Meta-Llama-3.1-8B-Instruct`
- **Embedding model**: `BAAI/bge-small-en-v1.5` → outputs 768-dim vectors
- **CRITICAL**: Model often wraps JSON in markdown fences. Always strip before parsing:
  ````typescript
  content
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
  ````
- **All agent system prompts MUST include**: "Respond ONLY with valid JSON. No markdown. No preamble."
- **Retry on 429**: exponential backoff, max 3 attempts

---

## VISUAL DESIGN SYSTEM

**Aesthetic**: Dark industrial terminal meets refined SaaS. NOT purple gradients.

```css
--bg-base: #0a0a0f; /* near-black with blue tint — main canvas */
--bg-surface: #12121a; /* cards, panels */
--bg-elevated: #1a1a28; /* elevated elements */
--border: #2a2a3d; /* borders */
--accent-primary: #00d4ff; /* electric cyan — primary actions, active states */
--accent-secondary: #7c3aed; /* violet — secondary actions */
--accent-success: #10b981; /* emerald green — approved/success */
--accent-warning: #f59e0b; /* amber — queued/regenerating */
--accent-danger: #ef4444; /* red — failed/error */
--text-primary: #f0f0f0;
--text-muted: #6b7280;
```

**Fonts**:

- `JetBrains Mono` — node labels, badges, titles (monospace = infrastructure feel)
- `Inter` — body text, descriptions

**Canvas**: dot grid background (`radial-gradient` dots at 28px spacing)
**Node cards**: glassmorphism (`backdrop-filter: blur(12px)`, `rgba(18,18,26,0.85)`)

---

## DAY 2: ITERATE MODE

When a user wants to expand a completed project:

1. User opens existing project, submits new prompt (e.g. "Add Stripe subscriptions")
2. Nodes 1–3 re-run with new prompt + existing schema as context
3. Tech Lead generates a **schema delta** (new Prisma models only), NOT a full rewrite
4. Shipyard creates a new branch (`feat/${slug}-${timestamp}`), pushes, opens a GitHub PR
5. DO App Platform auto-builds a preview deployment from the PR

---

## DEMO MODE

**URL param**: `?demo=true`

When active:

- Zero external API calls (no Gradient, no GitHub, no DO)
- Uses pre-cached responses from `scripts/demo-cache.ts`
- Fixed concept: "Client portal for a law firm"
- Node processing animations still run (with configurable delays in `DEMO_TIMING`)
- Shows "⚡ DEMO MODE" banner in top of UI
- Critical for hackathon reliability — must work 100% offline

---

## KEY CONSTRAINTS (NEVER BREAK THESE)

1. **No API keys in code** — env vars only, `.env.example` documents them
2. **Golden boilerplate stays private** — only SHA referenced in env var
3. **Max 5 regenerations per node** — check version count before queuing, return 429 if exceeded
4. **All agent JSON output must be validated** — if JSON.parse fails, retry up to 3x then FAILED
5. **SSE cleanup on disconnect** — always unsubscribe Redis + clear heartbeat interval
6. **Shipyard steps are idempotent** — check `stepXDone` flags before re-running
7. **ZIP cleanup** — schedule BullMQ delayed job to delete `/tmp/forgeos/:id` after 1 hour

---

## DEV COMMANDS

```bash
docker-compose up -d          # Start local Postgres + Redis
pnpm dev                       # Start all apps (api :3001, web :5173)
pnpm db:migrate                # Run prisma migrate dev
pnpm db:generate               # Regenerate Prisma client
pnpm db:studio                 # Open Prisma Studio
pnpm seed                      # Seed 5 demo projects into pgvector
pnpm typecheck                 # Check TypeScript across all packages
pnpm build                     # Build all apps
```

---

## BUILD PHASES (Reference)

The project was designed to be built in 6 phases. Phase prompt files live in `docs/phases/`:

| File                              | Phase                                       |
| --------------------------------- | ------------------------------------------- |
| `docs/phases/phase-1-infra.md`    | Infrastructure & Foundation                 |
| `docs/phases/phase-2-backend.md`  | Backend Core (API, SSE, BullMQ)             |
| `docs/phases/phase-3-agents.md`   | AI Agents (Strategist, BA, Tech Lead + RAG) |
| `docs/phases/phase-4-frontend.md` | Frontend (React Flow canvas, HITL panels)   |
| `docs/phases/phase-5-shipyard.md` | Shipyard + Iterate Mode                     |
| `docs/phases/phase-6-polish.md`   | Demo Mode + Visual Polish                   |

If you're starting a new session mid-project, check which phase is complete by running:

```bash
pnpm typecheck && echo "Types OK"
curl http://localhost:3001/health && echo "API OK"
```

---

## FOR THE AI READING THIS

You are working on a hackathon project with a hard deadline. Priorities in order:

1. **It works** — functional beats perfect
2. **Demo reliability** — `?demo=true` must be bulletproof
3. **Visual polish** — judges see the UI first
4. **Code quality** — TypeScript strict, no `any`, proper error handling

When in doubt about a library API: **use context7 MCP** — don't guess from training data.
When touching the DB schema: **use prisma MCP** — run migrations through it.
When building UI components: **use shadcn MCP** — get actual current props.

The `.mcp.json` in the project root has all MCP servers pre-configured. Use them.
