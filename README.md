<br/>

<div align="center">

# ⚡ ForgeOS Node Studio

### AI-Agent Software Factory

**A production-ready Next/Vite Monorepo demonstrating human-in-the-loop AI software generation pipelines using React Flow and Digital Ocean's Gradient LLaMA.**

[Installation](#installation) • [Architecture](#architecture) • [Usage](#usage)

</div>

---

## 📖 Overview

ForgeOS is an end-to-end multi-agent pipeline workflow builder to scaffold and deploy web platforms based purely on a high-level creative prompt concept. It combines **pgvector** context logic (RAG) with LLaMA reasoning models running concurrently on the BullMQ queue scheduler.

## 🌟 Key Features

1. **Stateful Canvas**: Node-based React Flow studio to visualize agent activities.
2. **Human-in-the-loop (HITL)**: Intercept JSON outputs and direct agents before next pipeline phases execute.
3. **Queue Architecture**: Resilient Redis message queues ensure long-running deployments don't timeout.
4. **DigitalOcean Gradient Integration**: First-class support for low-latency agent generation via open-source LLMs.

## 🛠 Tech Stack

- **Monorepo**: PNPM, Turborepo
- **API**: Express, BullMQ, SSE Streams
- **Database**: PostgreSQL (pgvector via Prisma)
- **Frontend**: React, React Flow, Zustand, TailwindCSS

<br/>

## 🚀 Installation & Setup

Ensure you have:
- Node.js 18+ (tested on Node v20)
- `pnpm` available gobally
- Redis server
- PostgreSQL database (with `pgvector` extension)

1. **Clone & Install**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   Duplicate root `.env.example` -> `.env`. Repeat for `.env` in `apps/api`.
   Fill out `DATABASE_URL`, `REDIS_URL`, and `GRADIENT_ACCESS_TOKEN`.

3. **Database initialization**
   ```bash
   cd packages/shared
   npx prisma generate
   npx prisma db push
   ```

4. **Seed Agency memory (RAG Context)**
   ```bash
   npx tsx scripts/seed-agency-memory.ts
   ```

5. **Start Servers**
   ```bash
   pnpm dev
   ```

> View the client dashboard at `http://localhost:5173`.

---

© 2026 Pham Thanh Hang - Hackathon Submission.
