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
    const systemPrompt = `You are a seasoned Tech Lead and software architect specializing in modern SaaS products built with Next.js. You've led engineering teams at Series A startups and know how to scope work realistically.

Your technical plan will be read by BOTH developers (who need accuracy) and non-technical founders (who need to understand the build timeline and complexity). Write feature and endpoint descriptions in plain English.

Produce working, valid Prisma schema syntax — this will be directly used in the codebase.

CRITICAL: Respond ONLY with valid JSON. The prismaSchemaDelta field must contain valid Prisma schema syntax escaped as a JSON string.`

    const userPrompt = `Design the technical architecture and build plan for this SaaS product.

Product Concept: "${data.concept}"

Target Audience: ${data.strategyOutput.targetAudience}
Must-Have Features: ${data.strategyOutput.mvpFeatures.filter(f => f.priority === 'MUST').map(f => f.name).join(', ')}
Should-Have Features: ${data.strategyOutput.mvpFeatures.filter(f => f.priority === 'SHOULD').map(f => f.name).join(', ')}

Data model from Business Analyst:
${data.analystOutput.dataEntities.map((e) => `- ${e.name}: ${e.fields.map((f) => `${f.name} (${f.type})`).join(', ')} | Relations: ${e.relations.join(', ')}`).join('\n')}

Required integrations: ${data.analystOutput.integrations.join(', ')}

Base Prisma schema already in the boilerplate — DO NOT repeat the User model, only add new models:
${BASE_SCHEMA}

${data.rejectionFeedback ? `⚠️ Previous output was rejected — feedback: "${data.rejectionFeedback}"\nRevise accordingly.` : ''}

Return JSON with EXACTLY this structure:
{
  "techStack": {
    "frontend": ["Next.js 14 (App Router)", "TypeScript", "Tailwind CSS", "shadcn/ui", "Zustand (state)"],
    "backend": ["Next.js API Routes", "Prisma ORM", "Zod (validation)", "NextAuth.js"],
    "database": ["PostgreSQL (primary)", "Redis (sessions/cache)"],
    "infrastructure": ["DigitalOcean App Platform", "DO Managed PostgreSQL", "DO Spaces (file storage)"]
  },
  "prismaSchemaDelta": "model Project {\\n  id        String   @id @default(cuid())\\n  name      String\\n  userId    String\\n  user      User     @relation(fields: [userId], references: [id])\\n  createdAt DateTime @default(now())\\n  updatedAt DateTime @updatedAt\\n}",
  "phase1Features": [
    { "feature": "Plain English description of what gets built (e.g. 'User login and account management')", "estimatedDays": 3 }
  ],
  "phase2Features": [
    { "feature": "Plain English description (e.g. 'Payment integration with Stripe and subscription plans')", "estimatedDays": 5 }
  ],
  "apiEndpoints": [
    { "method": "POST", "path": "/api/resource", "description": "Plain English: what this does and who calls it" }
  ],
  "envVarsRequired": ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "List all needed env vars"]
}

Rules for prismaSchemaDelta:
- MUST be valid Prisma schema syntax
- Include ALL new models needed (not User — it's already there)
- Use cuid() for IDs, include createdAt/updatedAt on every model
- Include proper @relation directives for foreign keys
- Add enums if needed for status fields

Rules for features:
- phase1Features: 4-6 items (MVP launch scope, should ship in ~2-4 weeks)
- phase2Features: 4-6 items (post-launch iteration, 1-2 months)
- apiEndpoints: 6-12 endpoints covering all core CRUD operations
- estimatedDays: be realistic (auth=3, CRUD=2, payments=4, notifications=2)`

    const raw = await gradientClient.chat({ systemPrompt, userPrompt, maxTokens: 3500, temperature: 0.4 })
    return gradientClient.parseJSON<TechLeadOutput>(raw)
}
