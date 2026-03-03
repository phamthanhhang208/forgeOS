# ForgeOS Node Studio — PHASE 5: Shipyard & Iterate Mode
# DigitalOcean Hackathon

---

## CONTEXT RECAP
ForgeOS is a multi-agent SaaS incubation platform. Phases 1–4 complete:
- Full backend API + SSE streaming
- All 3 LLM agents producing real JSON with RAG context
- Frontend canvas with real-time node animations + HITL panels
- Approve/reject loop fully functional end-to-end in the browser

**Your job in Phase 5**: Build Node 4 — The Shipyard. This is the DevOps execution engine: clone the golden boilerplate, inject the Tech Lead's Prisma schema, push to a new GitHub repo, deploy to DO App Platform, poll for build status. Also implement Day 2 Iterate Mode — when a user wants to expand an existing deployed app, the Shipyard creates a branch + PR instead of a fresh deployment. Also build the ZIP export for local stack download.

---

## MCP SERVERS — USE THESE
- **digitalocean** → USE THIS for all DO App Platform operations. Do NOT write raw `fetch` wrappers if the MCP can do it. Use it to: create apps, poll deployment status, fetch build logs, verify database clusters. This is the single biggest time-saver in this phase.
- **github** → test Octokit repo creation and PR opening directly
- **context7** → use for @octokit/rest, archiver docs
- **postgres** → verify Deployment records after each step

---

## TASK 1: GitHub Integration (`apps/api/src/lib/github.ts`)

```typescript
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
const GITHUB_ORG = process.env.GITHUB_ORG!

export const github = {
  // Create a new repo under GITHUB_ORG
  createRepo: async (name: string, description: string) => {
    const response = await octokit.repos.createInOrg({
      org: GITHUB_ORG,
      name,
      description,
      private: false,     // public for hackathon demo
      auto_init: false,   // we push our own content
    })
    return response.data
  },

  // Push a local directory to a GitHub repo
  // Uses git CLI via child_process (simpler than Octokit tree API for binary files)
  pushDirectory: async (localPath: string, repoUrl: string, branch = 'main') => {
    const { execSync } = await import('child_process')
    execSync(`git init && git add -A && git commit -m "chore: initial ForgeOS scaffold"`, { cwd: localPath })
    execSync(`git remote add origin ${repoUrl}`, { cwd: localPath })
    execSync(`git push -u origin ${branch}`, { cwd: localPath })
  },

  // Create a branch from main
  createBranch: async (owner: string, repo: string, branchName: string) => {
    const mainRef = await octokit.git.getRef({ owner, repo, ref: 'heads/main' })
    await octokit.git.createRef({
      owner, repo,
      ref: `refs/heads/${branchName}`,
      sha: mainRef.data.object.sha,
    })
  },

  // Open a PR
  createPR: async (owner: string, repo: string, head: string, title: string, body: string) => {
    const response = await octokit.pulls.create({
      owner, repo, head, base: 'main', title, body,
      draft: false,
    })
    return response.data
  }
}
```

---

## TASK 2: DigitalOcean Integration (`apps/api/src/lib/digitalocean.ts`)

> **MCP-FIRST**: The `digitalocean` MCP server is available in `.mcp.json`. Use it directly during development and testing to create apps, check status, and fetch logs without writing wrapper code first.
>
> Example prompts to use during development:
> - *"Use the digitalocean MCP to create a new App Platform app from repo myorg/my-repo on branch main in region sgp"*
> - *"Use the digitalocean MCP to check the deployment status of app ID abc123"*
> - *"Use the digitalocean MCP to get the build logs for app abc123"*

The `digitalocean.ts` wrapper exists for **programmatic use inside BullMQ workers** (the MCP is interactive, not callable from Node.js code). Write it as a thin typed wrapper around the DO REST API — the MCP tells you exactly what the API returns so you can type it correctly.

```typescript
const DO_API = 'https://api.digitalocean.com/v2'
const headers = {
  Authorization: `Bearer ${process.env.DO_API_TOKEN}`,
  'Content-Type': 'application/json',
}

export const doClient = {
  // Create a new App Platform app connected to a GitHub repo
  // Use DO MCP first to prototype this call, then translate to code
  createApp: async (params: {
    name: string
    githubRepo: string   // e.g. "myorg/my-repo"
    branch?: string      // default: 'main'
  }) => {
    const res = await fetch(`${DO_API}/apps`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        spec: {
          name: params.name,
          region: 'sgp',    // Singapore — closest to Vietnam 🇻🇳
          services: [{
            name: 'web',
            github: {
              repo: params.githubRepo,
              branch: params.branch ?? 'main',
              deploy_on_push: true,
            },
            build_command: 'npm install && npm run build',
            run_command: 'npm start',
            http_port: 3000,
            instance_size_slug: 'apps-s-1vcpu-0.5gb',
            instance_count: 1,
          }]
        }
      })
    })
    if (!res.ok) throw new Error(`DO API error: ${res.status} ${await res.text()}`)
    const data = await res.json()
    return data.app as { id: string; live_url?: string; default_ingress?: string }
  },

  // Get app status — use DO MCP to inspect live app state during debugging
  getApp: async (appId: string) => {
    const res = await fetch(`${DO_API}/apps/${appId}`, { headers })
    if (!res.ok) throw new Error(`DO API error: ${res.status}`)
    const data = await res.json()
    return data.app as { id: string; live_url?: string; active_deployment?: { phase: string } }
  },

  // Get deployment logs — use DO MCP to check this interactively when debugging
  getDeploymentLogs: async (appId: string, deploymentId: string) => {
    const res = await fetch(`${DO_API}/apps/${appId}/deployments/${deploymentId}/logs`, { headers })
    if (!res.ok) throw new Error(`DO API error: ${res.status}`)
    return res.json() as Promise<{ historic_urls: string[] }>
  },

  // Poll until app build is ACTIVE or timeout
  waitForActive: async (appId: string, maxPolls = 20, intervalMs = 15000): Promise<string | null> => {
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, intervalMs))
      const app = await doClient.getApp(appId)
      const phase = app.active_deployment?.phase
      if (phase === 'ACTIVE') return app.live_url ?? app.default_ingress ?? null
      if (phase === 'ERROR' || phase === 'CANCELED') {
        // When build fails: use DO MCP to fetch logs interactively for debugging
        throw new Error(`DO build failed with phase: ${phase}. Use DO MCP to check logs.`)
      }
    }
    throw new Error('DO build timed out after 5 minutes')
  }
}
```

**Development workflow for this task:**
1. Use the `digitalocean` MCP to manually create a test app and verify the spec format works
2. Use the MCP to check the app status and see what the response shape looks like
3. Copy the correct shape into the TypeScript types above
4. Wire the wrapper into the Shipyard agent

---

## TASK 3: ZIP Exporter (`apps/api/src/lib/zipExporter.ts`)

```typescript
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

export async function createLocalStack(params: {
  projectId: string
  localRepoPath: string
  envVarsRequired: string[]
}): Promise<string> {
  const outDir = `/tmp/forgeos/${params.projectId}`
  await fs.promises.mkdir(outDir, { recursive: true })
  const zipPath = path.join(outDir, 'local-stack.zip')

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve(zipPath))
    archive.on('error', reject)
    archive.pipe(output)

    // Add repo contents
    archive.directory(params.localRepoPath, 'app')

    // Add generated docker-compose.yml
    archive.append(generateDockerCompose(), { name: 'docker-compose.yml' })

    // Add .env.example
    const envExample = params.envVarsRequired.map(v => `${v}=`).join('\n')
    archive.append(envExample, { name: '.env.example' })

    // Add README
    archive.append(generateLocalReadme(params.projectId), { name: 'README.md' })

    archive.finalize()
  })
}

function generateDockerCompose(): string {
  return `version: '3.8'
services:
  app:
    build: ./app
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres
      - redis
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`
}

function generateLocalReadme(projectId: string): string {
  return `# ForgeOS Generated App

Generated by ForgeOS Node Studio (project: ${projectId})

## Quick Start
1. Copy \`.env.example\` to \`.env\` and fill in values
2. Run: \`docker-compose up\`
3. Open: http://localhost:3000
`
}
```

---

## TASK 4: The Shipyard Agent (`apps/api/src/workers/agents/shipyard.ts`)

This is the most complex piece. Build each step atomically and update the DB after each step so failures are recoverable.

```typescript
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../prisma'
import { publishEvent } from '../../lib/pubsub'
import { github } from '../../lib/github'
import { doClient } from '../../lib/digitalocean'
import { createLocalStack } from '../../lib/zipExporter'
import type { TechLeadOutput } from './techlead'
import { slugify } from '../../lib/utils'

interface ShipyardJobData {
  projectId: string
  concept: string
  techLeadOutput: TechLeadOutput
  mode: 'NEW' | 'ITERATE'
  existingGithubRepo?: string      // For ITERATE mode
  iterationPrompt?: string         // For ITERATE mode
}

export async function runShipyard(data: ShipyardJobData): Promise<Record<string, unknown>> {
  const { projectId, concept, techLeadOutput, mode } = data

  // Find or create Deployment record
  let deployment = await prisma.deployment.upsert({
    where: { projectId },
    create: { projectId, buildStatus: 'CLONING' },
    update: { buildStatus: 'CLONING' },
  })

  const repoSlug = slugify(concept).slice(0, 40) + '-' + projectId.slice(0, 6)
  const localPath = `/tmp/forgeos/repos/${projectId}`

  // ─── STEP A: Clone & Inject ──────────────────────────────────────────────
  if (!deployment.stepADone) {
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'A', status: 'START' })
    
    const boilerplateRepo = process.env.GOLDEN_BOILERPLATE_REPO!
    const boilerplateSHA = process.env.GOLDEN_BOILERPLATE_SHA!
    const githubToken = process.env.GITHUB_TOKEN!

    // Clone boilerplate at pinned SHA
    await fs.promises.mkdir(localPath, { recursive: true })
    execSync(
      `git clone https://${githubToken}@github.com/${boilerplateRepo}.git ${localPath}`,
      { stdio: 'pipe' }
    )
    execSync(`git checkout ${boilerplateSHA}`, { cwd: localPath, stdio: 'pipe' })
    
    // Remove git history (fresh start for user's repo)
    await fs.promises.rm(path.join(localPath, '.git'), { recursive: true })

    // Inject Tech Lead's Prisma schema
    const schemaPath = path.join(localPath, 'prisma', 'schema.prisma')
    const existingSchema = await fs.promises.readFile(schemaPath, 'utf-8')
    const newSchema = existingSchema + '\n\n// ForgeOS Generated Models\n' + techLeadOutput.prismaSchemaDelta
    await fs.promises.writeFile(schemaPath, newSchema)

    // Write .env.example from Tech Lead's envVarsRequired
    const envExample = techLeadOutput.envVarsRequired.map(v => `${v}=`).join('\n')
    await fs.promises.writeFile(path.join(localPath, '.env.example'), envExample)

    await prisma.deployment.update({
      where: { projectId },
      data: { stepADone: true, buildStatus: 'PUSHING' }
    })
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'A', status: 'DONE' })
  }

  // ─── STEP B: Push to GitHub ──────────────────────────────────────────────
  if (!deployment.stepBDone) {
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'B', status: 'START' })
    
    let githubRepoUrl: string

    if (mode === 'NEW') {
      const repo = await github.createRepo(repoSlug, `ForgeOS generated: ${concept}`)
      githubRepoUrl = repo.html_url
      await github.pushDirectory(localPath, repo.clone_url)
    } else {
      // ITERATE MODE: create branch + PR
      const branchName = `feat/${slugify(data.iterationPrompt ?? 'update')}-${Date.now()}`
      const [owner, repo] = (data.existingGithubRepo ?? '').split('/')
      await github.createBranch(owner, repo, branchName)
      await github.pushDirectory(localPath, `https://${process.env.GITHUB_TOKEN}@github.com/${owner}/${repo}.git`, branchName)
      const pr = await github.createPR(
        owner, repo, branchName,
        `feat: ${data.iterationPrompt}`,
        `## ForgeOS Iteration\n\nGenerated by ForgeOS Node Studio.\n\n**Changes**: ${techLeadOutput.prismaSchemaDelta}`
      )
      githubRepoUrl = pr.html_url
    }

    deployment = await prisma.deployment.update({
      where: { projectId },
      data: { stepBDone: true, githubRepoUrl, buildStatus: 'DEPLOYING' }
    })
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'B', status: 'DONE' })

    // Start ZIP export async (don't await — runs in background)
    createLocalStack({
      projectId,
      localRepoPath: localPath,
      envVarsRequired: techLeadOutput.envVarsRequired,
    }).then(zipPath =>
      prisma.deployment.update({ where: { projectId }, data: { zipPath } })
    ).catch(console.error)
  }

  // ─── STEP C: Deploy to DO App Platform ───────────────────────────────────
  if (!deployment.stepCDone && mode === 'NEW') {
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'C', status: 'START' })
    
    const app = await doClient.createApp({
      name: repoSlug,
      githubRepo: `${process.env.GITHUB_ORG}/${repoSlug}`,
    })
    
    deployment = await prisma.deployment.update({
      where: { projectId },
      data: { stepCDone: true, doAppId: app.id }
    })
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'C', status: 'DONE' })
  }

  // ─── STEP D: Poll for Active Build ───────────────────────────────────────
  if (!deployment.stepDDone && deployment.doAppId && mode === 'NEW') {
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'D', status: 'START' })
    
    const liveUrl = await doClient.waitForActive(deployment.doAppId)
    
    deployment = await prisma.deployment.update({
      where: { projectId },
      data: { stepDDone: true, doAppUrl: liveUrl, buildStatus: 'ACTIVE' }
    })
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'COMPLETED' }
    })
    await publishEvent(projectId, { type: 'SHIPYARD_STEP', step: 'D', status: 'DONE' })
    await publishEvent(projectId, {
      type: 'DEPLOYMENT_COMPLETE',
      githubUrl: deployment.githubRepoUrl ?? '',
      doAppUrl: liveUrl ?? '',
      zipReady: !!deployment.zipPath,
    })

    // Embed this project in agency memory for future RAG queries
    await embedProjectInMemory(projectId, concept, techLeadOutput)
  }

  return {
    githubRepoUrl: deployment.githubRepoUrl,
    doAppUrl: deployment.doAppUrl,
    buildStatus: deployment.buildStatus,
  }
}

// After successful deployment: embed project summary into AgencyMemory
async function embedProjectInMemory(projectId: string, concept: string, output: TechLeadOutput) {
  const { gradientClient } = await import('../../lib/gradient')
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) return

  const summary = `${concept}. Stack: ${output.techStack.frontend.join(', ')}, ${output.techStack.backend.join(', ')}. Phase 1 features: ${output.phase1Features.map(f => f.feature).join(', ')}.`
  const tags = [...output.techStack.frontend, ...output.techStack.backend].map(t => t.toLowerCase().replace(/[^a-z0-9]/g, '-'))

  const [embedding] = await gradientClient.embed({ texts: [summary] })
  
  await prisma.$executeRaw`
    INSERT INTO "AgencyMemory" (id, "agencyId", "projectSummary", tags, embedding, "createdAt")
    VALUES (
      ${`mem-${projectId}`},
      ${project.agencyId},
      ${summary},
      ${tags},
      ${JSON.stringify(embedding)}::vector,
      NOW()
    )
  `
}
```

---

## TASK 5: Utility (`apps/api/src/lib/utils.ts`)

```typescript
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 63)
}
```

---

## TASK 6: Wire Shipyard into Pipeline Worker

In `pipeline.worker.ts`, replace the Shipyard stub:

```typescript
case 4: {
  const techLeadOutput = job.data.previousOutputs[3] as TechLeadOutput
  payload = await runShipyard({
    projectId: job.data.projectId,
    concept: job.data.concept,
    techLeadOutput,
    mode: job.data.mode ?? 'NEW',
    existingGithubRepo: job.data.existingGithubRepo,
    iterationPrompt: job.data.iterationPrompt,
  })
  break
}
```

Note: Shipyard does NOT pause for HITL review. After Node 3 is approved, Shipyard fires automatically and runs to completion (or failure). No review panel needed for Node 4.

---

## TASK 7: Day 2 Iterate Mode API Route

Add to `routes/projects.ts`:

```typescript
// POST /api/projects/:id/iterate
// Body: { prompt: string }
// 
// 1. Find existing completed project with its deployment
// 2. Create a NEW project record with mode: ITERATE, linking back to parent
// 3. Queue job with: { mode: 'ITERATE', existingGithubRepo, iterationPrompt: prompt }
// 4. The pipeline runs nodes 1-3 again for the iteration
// 5. Shipyard creates branch + PR instead of new deployment
```

---

## PHASE 5 COMPLETION CHECKLIST

Test each step independently before proceeding:

- [ ] DO MCP connected: ask it to "list my App Platform apps" — verify your token works
- [ ] `github.createRepo()` creates a real repo in your GitHub org (verify via github MCP)
- [ ] `github.pushDirectory()` pushes boilerplate code to the repo
- [ ] Step A completes: boilerplate cloned, `schema.prisma` injected correctly
- [ ] Step B completes: new GitHub repo visible at returned URL
- [ ] Step C completes: use DO MCP to confirm App record created ("show my apps")
- [ ] Step D completes: use DO MCP to check build logs if it fails ("get logs for app X")
- [ ] App builds and `doAppUrl` returns a working URL
- [ ] Deployment record in DB reflects all steps: verify via postgres MCP
- [ ] SSE client receives all SHIPYARD_STEP events in order
- [ ] SSE client receives DEPLOYMENT_COMPLETE with live URLs
- [ ] Frontend Shipyard panel shows each step ticking green in real-time
- [ ] ZIP download works: `GET /api/projects/:id/download` streams a valid ZIP
- [ ] After deployment: project appears in AgencyMemory (verify via postgres MCP)
- [ ] Iterate mode creates a branch + PR instead of new deployment (verify via github MCP)
- [ ] Partial failure recovery: if step B fails, restarting the job doesn't re-clone (stepADone flag)
