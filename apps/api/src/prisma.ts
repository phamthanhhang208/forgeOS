import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env from workspace root
// tsx runs from apps/api/, so we go up 2 levels to reach workspace root
const envPath = path.resolve(process.cwd(), '../../.env')
dotenv.config({ path: envPath })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL!
const url = new URL(connectionString)

const pool = new pg.Pool({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: url.searchParams.get('sslmode') === 'require'
        ? { rejectUnauthorized: false }
        : undefined,
})

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter: new PrismaPg(pool),
        log: ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
