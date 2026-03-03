import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { gradientClient } from '../apps/api/src/lib/gradient'

const prisma = new PrismaClient()

const DEMO_PROJECTS = [
    {
        summary:
            'B2B invoice management SaaS for freelancers. Features: auto-invoice generation, payment tracking, client portal, Stripe integration. Stack: Next.js, PostgreSQL, Stripe. Successfully launched with 200 beta users.',
        tags: ['b2b', 'fintech', 'invoicing', 'freelancer', 'stripe', 'saas'],
    },
    {
        summary:
            'Client portal for a digital marketing agency. Features: campaign dashboard, report sharing, approval workflows, real-time notifications. Stack: Next.js, PostgreSQL, Redis. Reduced client communication overhead by 60%.',
        tags: ['b2b', 'agency', 'portal', 'dashboard', 'marketing', 'collaboration'],
    },
    {
        summary:
            'Project and case tracker for a law firm. Features: matter management, time tracking, billing, document storage, client updates. Stack: Next.js, PostgreSQL, S3. HIPAA-adjacent compliance patterns applied.',
        tags: ['legal', 'b2b', 'tracker', 'billing', 'documents', 'professional-services'],
    },
    {
        summary:
            'Analytics and inventory dashboard for Shopify e-commerce sellers. Features: multi-store support, profit margin calculator, reorder alerts, competitor price tracking. Stack: Next.js, PostgreSQL, Shopify API.',
        tags: ['ecommerce', 'shopify', 'analytics', 'inventory', 'dashboard', 'retail'],
    },
    {
        summary:
            'Team knowledge base for remote-first startups. Features: AI-powered search, version history, team wikis, onboarding flows, Slack integration. Stack: Next.js, PostgreSQL, pgvector for semantic search.',
        tags: ['saas', 'knowledge-management', 'remote', 'teams', 'ai', 'documentation'],
    },
]

const DEMO_AGENCY_ID = process.env.DEMO_AGENCY_ID ?? 'demo-agency-cuid'

async function seed() {
    console.log('🌱 Seeding agency memory...')

    // Upsert demo agency
    await prisma.agency.upsert({
        where: { id: DEMO_AGENCY_ID },
        create: { id: DEMO_AGENCY_ID, name: 'Demo Agency' },
        update: {},
    })

    // Delete existing memories for clean re-seed
    await prisma.agencyMemory.deleteMany({ where: { agencyId: DEMO_AGENCY_ID } })

    // Embed all summaries in one batch call
    const embeddings = await gradientClient.embed({
        texts: DEMO_PROJECTS.map((p) => p.summary),
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
    .catch((e) => {
        console.error('Seed failed:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
