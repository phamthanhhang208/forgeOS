# ForgeOS Node Studio — PHASE 3: AI Agents
# DigitalOcean Hackathon

---

## CONTEXT RECAP
ForgeOS is a multi-agent SaaS incubation platform. Phases 1–2 complete:
- Monorepo, shared types, Prisma schema, Docker all running
- Express API with all CRUD routes + approve/reject logic
- SSE streaming via Redis pub/sub working end-to-end
- BullMQ worker scaffold with stub agents
- DO Gradient client (`gradientClient`) tested and working

**Your job in Phase 3**: Replace every stub agent with real LLM implementations using DO Gradient (Llama 3.1 8B). Add RAG context via pgvector. Add the seed script for demo agency memory. Each agent must: query RAG context → call Gradient → parse JSON strictly → return typed payload.

---

## MCP SERVERS — USE THESE
- **context7** → use for Prisma raw queries (pgvector cosine similarity syntax)
- **postgres** → verify embeddings after seeding
- **prisma** → run seed migration if schema changes needed

---

## TASK 1: RAG Helper (`apps/api/src/workers/rag.ts`)

Queries pgvector for past similar agency projects to give agents context.

```typescript
import { prisma } from '../prisma'
import { gradientClient } from '../lib/gradient'

export async function getRAGContext(
  agencyId: string,
  concept: string,
  topK: number = 3
): Promise<string> {
  // 1. Embed the concept using BGE
  const [embedding] = await gradientClient.embed({ texts: [concept] })
  
  // 2. Query pgvector with cosine similarity
  //    Use Prisma.$queryRaw with the <=> operator (cosine distance)
  //    Filter by agencyId, order by distance ASC, limit topK
  const similar = await prisma.$queryRaw<Array<{ projectSummary: string; tags: string[] }>>`
    SELECT "projectSummary", tags
    FROM "AgencyMemory"
    WHERE "agencyId" = ${agencyId}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${topK}
  `
  
  // 3. Format as context string
  if (similar.length === 0) return 'No past similar projects found.'
  
  return similar.map((m, i) =>
    `Past Project ${i + 1}:\n${m.projectSummary}\nTags: ${m.tags.join(', ')}`
  ).join('\n\n')
}
```

---

## TASK 2: Node 1 — The Strategist (`apps/api/src/workers/agents/strategist.ts`)

```typescript
import { gradientClient } from '../../lib/gradient'
import { getRAGContext } from '../rag'

export interface StrategistOutput {
  targetAudience: string
  audienceSegments: string[]
  mvpFeatures: Array<{
    name: string
    priority: 'MUST' | 'SHOULD' | 'COULD'
    rationale: string
  }>
  monetizationStrategy: string
  marketDifferentiators: string[]
  riskFactors: string[]
}

export async function runStrategist(data: {
  agencyId: string
  concept: string
  rejectionFeedback?: string
}): Promise<StrategistOutput> {
  const ragContext = await getRAGContext(data.agencyId, data.concept)

  const systemPrompt = `You are the Strategist agent for a software agency incubation platform.
Your role is to analyze a raw SaaS concept and produce a focused strategic analysis.
You have access to context from this agency's past successful projects.

CRITICAL: Respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanation, no preamble. Just the JSON object.`

  const userPrompt = `Analyze this SaaS concept and return strategic analysis JSON.

Concept: "${data.concept}"

Agency's past similar projects for context:
${ragContext}

${data.rejectionFeedback ? `IMPORTANT - Previous output was rejected with this feedback: "${data.rejectionFeedback}"\nAddress this feedback directly in your new response.` : ''}

Return JSON with EXACTLY this structure:
{
  "targetAudience": "string describing primary target customer",
  "audienceSegments": ["segment 1", "segment 2", "segment 3"],
  "mvpFeatures": [
    { "name": "Feature name", "priority": "MUST", "rationale": "Why this is critical for MVP" }
  ],
  "monetizationStrategy": "string describing pricing/revenue model",
  "marketDifferentiators": ["differentiator 1", "differentiator 2"],
  "riskFactors": ["risk 1", "risk 2", "risk 3"]
}

Include 4-6 MVP features, 2-4 differentiators, 3-5 risks.`

  const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 2000 })
  return gradientClient.parseJSON<StrategistOutput>(raw)
}
```

---

## TASK 3: Node 2 — The Business Analyst (`apps/api/src/workers/agents/analyst.ts`)

```typescript
import { gradientClient } from '../../lib/gradient'
import type { StrategistOutput } from './strategist'

export interface AnalystOutput {
  userPersonas: Array<{
    name: string
    role: string
    painPoints: string[]
    goals: string[]
  }>
  coreUserStories: Array<{
    asA: string
    iWantTo: string
    soThat: string
    acceptanceCriteria: string[]
  }>
  dataEntities: Array<{
    name: string
    fields: Array<{ name: string; type: string }>
    relations: string[]
  }>
  integrations: string[]
}

export async function runAnalyst(data: {
  concept: string
  strategyOutput: StrategistOutput
  rejectionFeedback?: string
}): Promise<AnalystOutput> {
  const systemPrompt = `You are the Business Analyst agent for a software agency incubation platform.
You translate approved strategic analysis into concrete technical product requirements.
CRITICAL: Respond ONLY with valid JSON. No markdown. No preamble. JSON only.`

  const userPrompt = `Convert this approved strategy into technical product requirements.

Original Concept: "${data.concept}"

Approved Strategy:
${JSON.stringify(data.strategyOutput, null, 2)}

${data.rejectionFeedback ? `Previous output was rejected: "${data.rejectionFeedback}"\nAddress this in your response.` : ''}

Return JSON with EXACTLY this structure:
{
  "userPersonas": [
    {
      "name": "Persona name",
      "role": "Their job/role",
      "painPoints": ["pain 1", "pain 2"],
      "goals": ["goal 1", "goal 2"]
    }
  ],
  "coreUserStories": [
    {
      "asA": "persona type",
      "iWantTo": "action",
      "soThat": "benefit",
      "acceptanceCriteria": ["criteria 1", "criteria 2"]
    }
  ],
  "dataEntities": [
    {
      "name": "EntityName",
      "fields": [{ "name": "fieldName", "type": "String | Int | Boolean | DateTime | Float" }],
      "relations": ["EntityName has many OtherEntity"]
    }
  ],
  "integrations": ["Stripe", "SendGrid", "etc"]
}

Include 2-3 personas, 5-8 user stories, 4-7 data entities.`

  const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 2500 })
  return gradientClient.parseJSON<AnalystOutput>(raw)
}
```

---

## TASK 4: Node 3 — The Tech Lead (`apps/api/src/workers/agents/techlead.ts`)

```typescript
import { gradientClient } from '../../lib/gradient'
import type { StrategistOutput } from './strategist'
import type { AnalystOutput } from './analyst'

export interface TechLeadOutput {
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
    infrastructure: string[]
  }
  prismaSchemaDelta: string
  phase1Features: Array<{ feature: string; estimatedDays: number }>
  phase2Features: Array<{ feature: string; estimatedDays: number }>
  apiEndpoints: Array<{ method: string; path: string; description: string }>
  envVarsRequired: string[]
}

// The base boilerplate schema that will be EXTENDED (not replaced)
const BASE_SCHEMA = `
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`

export async function runTechLead(data: {
  concept: string
  strategyOutput: StrategistOutput
  analystOutput: AnalystOutput
  rejectionFeedback?: string
}): Promise<TechLeadOutput> {
  const systemPrompt = `You are the Tech Lead agent for a software agency incubation platform.
You design concrete system architectures for Next.js SaaS products.
You must produce valid Prisma schema syntax. Be precise and production-ready.
CRITICAL: Respond ONLY with valid JSON. The prismaSchemaDelta field must be valid Prisma syntax as a JSON string.`

  const userPrompt = `Design the technical architecture for this SaaS product.

Concept: "${data.concept}"

Strategy Summary: Target audience: ${data.strategyOutput.targetAudience}
Key features: ${data.strategyOutput.mvpFeatures.map(f => f.name).join(', ')}

Data Entities from BA:
${data.analystOutput.dataEntities.map(e => `- ${e.name}: ${e.fields.map(f => `${f.name}(${f.type})`).join(', ')}`).join('\n')}

Base Prisma schema already in boilerplate (extend this, don't repeat User model):
${BASE_SCHEMA}

${data.rejectionFeedback ? `Previous output was rejected: "${data.rejectionFeedback}"\nRevise accordingly.` : ''}

Return JSON with EXACTLY this structure:
{
  "techStack": {
    "frontend": ["Next.js 14", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    "backend": ["Next.js API Routes", "Prisma ORM", "Zod"],
    "database": ["PostgreSQL", "Redis (caching)"],
    "infrastructure": ["DigitalOcean App Platform", "DO Managed PostgreSQL"]
  },
  "prismaSchemaDelta": "model Project {\\n  id String @id @default(cuid())\\n  ...\\n}\\n\\nenum Status { ... }",
  "phase1Features": [{ "feature": "Feature name", "estimatedDays": 3 }],
  "phase2Features": [{ "feature": "Feature name", "estimatedDays": 5 }],
  "apiEndpoints": [{ "method": "POST", "path": "/api/projects", "description": "Create project" }],
  "envVarsRequired": ["DATABASE_URL", "NEXTAUTH_SECRET"]
}

Important: prismaSchemaDelta must be VALID Prisma schema for new models only (not User).
Include 3-5 phase1 features, 3-5 phase2 features, 5-10 API endpoints.`

  const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 3000 })
  return gradientClient.parseJSON<TechLeadOutput>(raw)
}
```

---

## TASK 5: Wire Agents into Pipeline Worker

Replace the stubs in `pipeline.worker.ts`:

```typescript
import { runStrategist } from './agents/strategist'
import { runAnalyst } from './agents/analyst'
import { runTechLead } from './agents/techlead'
// runShipyard stays as stub — implemented in Phase 5

// In the switch statement:
case 1: {
  payload = await runStrategist({
    agencyId: job.data.agencyId,
    concept: job.data.concept,
    rejectionFeedback: job.data.rejectionFeedback
  })
  break
}
case 2: {
  const strategyOutput = job.data.previousOutputs[1] as StrategistOutput
  payload = await runAnalyst({
    concept: job.data.concept,
    strategyOutput,
    rejectionFeedback: job.data.rejectionFeedback
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
    rejectionFeedback: job.data.rejectionFeedback
  })
  break
}
```

Also update the approve route in `routes/projects.ts` to include `previousOutputs` when queuing the next job:
```typescript
// When approving nodeId N, collect all approved outputs for nodes 1..N
const previousOutputs = await prisma.agentOutput.findMany({
  where: { projectId, status: 'APPROVED' },
  orderBy: { nodeId: 'asc' }
})
const outputMap = Object.fromEntries(previousOutputs.map(o => [o.nodeId, o.jsonPayload]))
// Pass outputMap as previousOutputs in the next job
```

---

## TASK 6: Seed Script (`scripts/seed-agency-memory.ts`)

```typescript
import { PrismaClient } from '@prisma/client'
import { gradientClient } from '../apps/api/src/lib/gradient'

const prisma = new PrismaClient()

const DEMO_PROJECTS = [
  {
    summary: 'B2B invoice management SaaS for freelancers. Features: auto-invoice generation, payment tracking, client portal, Stripe integration. Stack: Next.js, PostgreSQL, Stripe. Successfully launched with 200 beta users.',
    tags: ['b2b', 'fintech', 'invoicing', 'freelancer', 'stripe', 'saas']
  },
  {
    summary: 'Client portal for a digital marketing agency. Features: campaign dashboard, report sharing, approval workflows, real-time notifications. Stack: Next.js, PostgreSQL, Redis. Reduced client communication overhead by 60%.',
    tags: ['b2b', 'agency', 'portal', 'dashboard', 'marketing', 'collaboration']
  },
  {
    summary: 'Project and case tracker for a law firm. Features: matter management, time tracking, billing, document storage, client updates. Stack: Next.js, PostgreSQL, S3. HIPAA-adjacent compliance patterns applied.',
    tags: ['legal', 'b2b', 'tracker', 'billing', 'documents', 'professional-services']
  },
  {
    summary: 'Analytics and inventory dashboard for Shopify e-commerce sellers. Features: multi-store support, profit margin calculator, reorder alerts, competitor price tracking. Stack: Next.js, PostgreSQL, Shopify API.',
    tags: ['ecommerce', 'shopify', 'analytics', 'inventory', 'dashboard', 'retail']
  },
  {
    summary: 'Team knowledge base for remote-first startups. Features: AI-powered search, version history, team wikis, onboarding flows, Slack integration. Stack: Next.js, PostgreSQL, pgvector for semantic search.',
    tags: ['saas', 'knowledge-management', 'remote', 'teams', 'ai', 'documentation']
  }
]

const DEMO_AGENCY_ID = process.env.DEMO_AGENCY_ID ?? 'demo-agency-cuid'

async function seed() {
  console.log('🌱 Seeding agency memory...')

  // Upsert demo agency
  await prisma.agency.upsert({
    where: { id: DEMO_AGENCY_ID },
    create: { id: DEMO_AGENCY_ID, name: 'Demo Agency' },
    update: {}
  })

  // Delete existing memories for clean re-seed
  await prisma.agencyMemory.deleteMany({ where: { agencyId: DEMO_AGENCY_ID } })

  // Embed all summaries in one batch call
  const embeddings = await gradientClient.embed({
    texts: DEMO_PROJECTS.map(p => p.summary)
  })

  // Insert each memory with its embedding
  for (let i = 0; i < DEMO_PROJECTS.length; i++) {
    const project = DEMO_PROJECTS[i]
    const embedding = embeddings[i]
    
    await prisma.$executeRaw`
      INSERT INTO "AgencyMemory" (id, "agencyId", "projectSummary", tags, embedding, "createdAt")
      VALUES (
        ${`memory-${i + 1}`},
        ${DEMO_AGENCY_ID},
        ${project.summary},
        ${project.tags},
        ${JSON.stringify(embedding)}::vector,
        NOW()
      )
    `
    console.log(`  ✓ Seeded memory ${i + 1}/5: ${project.tags[0]}`)
  }

  console.log('✅ Agency memory seeded successfully')
  console.log(`   Agency ID: ${DEMO_AGENCY_ID}`)
  console.log(`   Memories: ${DEMO_PROJECTS.length}`)
}

seed()
  .catch(e => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

Run with: `pnpm seed`

---

## PHASE 3 COMPLETION CHECKLIST

- [ ] `pnpm seed` runs without error — verify via postgres MCP that 5 AgencyMemory rows have non-null embeddings
- [ ] POST a project → Node 1 produces real JSON from Gradient (not stub `{ _stub: true }`)
- [ ] Strategist JSON validates against `StrategistOutput` interface (no missing fields)
- [ ] Approve Node 1 → Node 2 fires with previous output passed correctly
- [ ] Analyst JSON validates against `AnalystOutput` interface
- [ ] Approve Node 2 → Node 3 fires
- [ ] Tech Lead `prismaSchemaDelta` is valid Prisma syntax (copy it out and run `prisma validate`)
- [ ] RAG context appears in agent responses (test with concept similar to seeded projects)
- [ ] Rejection with feedback → new version generated with feedback addressed
- [ ] 6th rejection attempt → 429 returned, no new job queued
- [ ] Zero TypeScript errors: `pnpm typecheck`
