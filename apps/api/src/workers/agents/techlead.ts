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
Key features: ${data.strategyOutput.mvpFeatures.map((f) => f.name).join(', ')}

Data Entities from BA:
${data.analystOutput.dataEntities.map((e) => `- ${e.name}: ${e.fields.map((f) => `${f.name}(${f.type})`).join(', ')}`).join('\n')}

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
