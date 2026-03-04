// Uploads demo project summaries to DO Spaces → triggers Gradient KB re-index

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'
dotenv.config()

const spaces = new S3Client({
    endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    region: process.env.DO_SPACES_REGION ?? 'sgp1',
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY!,
        secretAccessKey: process.env.DO_SPACES_SECRET!,
    },
})

const BUCKET = process.env.DO_SPACES_BUCKET!
const KB_UUID = process.env.DO_KNOWLEDGE_BASE_UUID!
const DO_API_TOKEN = process.env.DO_API_TOKEN!

const DEMO_MEMORIES = [
    {
        filename: 'memory-01-invoicing.txt',
        content: `Past Project: B2B Invoice Management SaaS for Freelancers
Target Audience: Independent freelancers and consultants
Stack: Next.js, PostgreSQL, Stripe, SendGrid
Key Features: Auto-invoice generation, payment tracking, client portal, Stripe integration
Outcome: Launched with 200 beta users. Reduced invoice admin time by 70%.
Tags: b2b, fintech, invoicing, freelancer, stripe, saas`,
    },
    {
        filename: 'memory-02-marketing-portal.txt',
        content: `Past Project: Client Portal for a Digital Marketing Agency
Target Audience: Marketing agencies managing multiple clients
Stack: Next.js, PostgreSQL, Redis, Slack integration
Key Features: Campaign dashboard, report sharing, approval workflows, real-time notifications
Outcome: Reduced client communication overhead by 60%.
Tags: b2b, agency, portal, dashboard, marketing, collaboration`,
    },
    {
        filename: 'memory-03-law-firm.txt',
        content: `Past Project: Case Tracker for a Law Firm
Target Audience: Small to mid-size law firms (5-50 attorneys)
Stack: Next.js, PostgreSQL, S3 document storage
Key Features: Matter management, time tracking, billing, document storage, client updates
Outcome: Reduced billing disputes by 40%. HIPAA-adjacent compliance applied.
Tags: legal, b2b, tracker, billing, documents, professional-services`,
    },
    {
        filename: 'memory-04-shopify-analytics.txt',
        content: `Past Project: Analytics Dashboard for Shopify Sellers
Target Audience: Shopify store owners managing 1-10 stores
Stack: Next.js, PostgreSQL, Shopify API, Redis caching
Key Features: Multi-store support, profit margin calculator, reorder alerts, price tracking
Outcome: Merchants reported 25% improvement in inventory decisions.
Tags: ecommerce, shopify, analytics, inventory, dashboard, retail`,
    },
    {
        filename: 'memory-05-knowledge-base.txt',
        content: `Past Project: Team Knowledge Base for Remote Startups
Target Audience: Remote teams of 10-100 people
Stack: Next.js, PostgreSQL, vector search, Slack integration
Key Features: AI-powered search, version history, team wikis, onboarding flows
Outcome: New employee onboarding reduced from 2 weeks to 3 days.
Tags: saas, knowledge-management, remote, teams, ai, documentation`,
    },
]

async function seed() {
    console.log('Seeding agency memories to DO Spaces...')

    for (const memory of DEMO_MEMORIES) {
        await spaces.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: `agency-memory/${memory.filename}`,
                Body: memory.content,
                ContentType: 'text/plain',
            })
        )
        console.log(`  + ${memory.filename}`)
    }

    console.log('\nTriggering Knowledge Base re-index...')

    const res = await fetch(
        `https://api.digitalocean.com/v2/gen-ai/knowledge_bases/${KB_UUID}/datasources/index`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${DO_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
        }
    )

    if (res.ok) {
        console.log('  Indexing job started')
        console.log('\nIndexing takes ~5-10 minutes.')
        console.log('Check progress: cloud.digitalocean.com -> Agent Platform -> Knowledge Bases')
    } else {
        const err = await res.text()
        console.error('  Failed to trigger indexing:', err)
        console.log('\nYou can manually trigger it from the DO Console -> Knowledge Base -> Re-index')
    }

    console.log('\nSeed upload complete!')
}

seed().catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
})
