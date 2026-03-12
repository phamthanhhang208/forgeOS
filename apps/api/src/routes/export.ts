import { Router } from 'express'
import { prisma } from '../prisma'
import { asyncHandler } from '../middleware/asyncHandler'
import { z } from 'zod'

export const exportRouter = Router()

const ExportSchema = z.object({
  target: z.enum(['claude', 'cursor', 'markdown']),
})

exportRouter.post('/:projectId/export', asyncHandler(async (req, res) => {
  const { projectId } = req.params
  const { target } = ExportSchema.parse(req.body)

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      agentOutputs: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Map agent outputs by nodeId (1=Strategist, 2=BusinessAnalyst, 3=TechLead)
  // Pick the latest approved version for each node
  const byNode: Record<number, unknown> = {}
  for (const o of project.agentOutputs) {
    if (o.status === 'APPROVED' || o.status === 'REVIEW') {
      if (!byNode[o.nodeId] || (o.version > (byNode[o.nodeId] as any).__version)) {
        byNode[o.nodeId] = { ...(o.jsonPayload as object), __version: o.version }
      }
    }
  }

  const strategist = byNode[1] as any
  const ba = byNode[2] as any
  const techLead = byNode[3] as any

  const content = formatHandoff({ project, strategist, ba, techLead, target })
  const filename = getFilename(target)

  res.json({ content, filename })
}))

function getFilename(target: string): string {
  switch (target) {
    case 'claude': return 'CLAUDE.md'
    case 'cursor': return '.cursorrules'
    default: return 'handoff.md'
  }
}

function formatHandoff({ project, strategist, ba, techLead, target }: {
  project: { concept: string }
  strategist: any
  ba: any
  techLead: any
  target: string
}): string {
  // Derive a display name from the concept (first sentence, truncated)
  const projectName = project.concept.split(/[.\n]/)[0].trim().slice(0, 60)

  const header =
    target === 'claude'
      ? `# ${projectName} — AI Assistant Context\n# Read this file at the start of every session.\n\n`
      : target === 'cursor'
      ? `# Cursor Rules for ${projectName}\n\n`
      : `# ${projectName} — Handoff Document\n\n`

  const parts: string[] = [header]

  parts.push(`## PROJECT OVERVIEW\n\n${project.concept}\n\n`)

  if (strategist) {
    parts.push(
      `## MARKET STRATEGY\n\n` +
      `**Target Audience:** ${strategist.targetAudience ?? 'N/A'}\n\n` +
      `**MVP Features:**\n${(strategist.mvpFeatures ?? []).map((f: any) =>
        typeof f === 'string' ? `- ${f}` : `- [${f.priority}] ${f.name} — ${f.rationale}`
      ).join('\n')}\n\n` +
      `**Monetization:** ${strategist.monetizationStrategy ?? 'N/A'}\n\n` +
      `**Differentiators:**\n${(strategist.marketDifferentiators ?? []).map((d: string) => `- ${d}`).join('\n')}\n\n` +
      `**Risk Factors:**\n${(strategist.riskFactors ?? []).map((r: string) => `- ${r}`).join('\n')}\n\n`
    )
  }

  if (ba) {
    parts.push(
      `## USER STORIES\n\n` +
      (ba.coreUserStories ?? []).map((s: any) =>
        `- As a **${s.asA}**, I want to **${s.iWantTo}** so that **${s.soThat}**`
      ).join('\n') + '\n\n' +
      `## DATA ENTITIES\n\n` +
      (ba.dataEntities ?? []).map((e: any) =>
        `- **${e.name}**: ${(e.fields ?? []).map((f: any) =>
          typeof f === 'string' ? f : `${f.name} (${f.type})`
        ).join(', ')}`
      ).join('\n') + '\n\n'
    )
  }

  if (techLead) {
    const stack = techLead.techStack ?? {}
    const stackLines = Array.isArray(stack)
      ? stack.map((v: string) => `- ${v}`)
      : Object.entries(stack).map(([k, v]) => `- **${k}:** ${Array.isArray(v) ? (v as string[]).join(', ') : v}`)

    parts.push(
      `## TECH STACK\n\n` +
      stackLines.join('\n') + '\n\n' +
      `## PHASE 1 FEATURES\n\n` +
      (techLead.phase1Features ?? []).map((f: any) =>
        typeof f === 'string' ? `- ${f}` : `- ${f.feature} (~${f.estimatedDays}d)`
      ).join('\n') + '\n\n' +
      `## API ENDPOINTS\n\n` +
      (techLead.apiEndpoints ?? []).map((e: any) =>
        `- \`${e.method} ${e.path}\` — ${e.description}`
      ).join('\n') + '\n\n' +
      `## PRISMA SCHEMA DELTA\n\n\`\`\`prisma\n${techLead.prismaSchemaDelta ?? ''}\n\`\`\`\n\n` +
      `## REQUIRED ENV VARS\n\n` +
      (techLead.envVarsRequired ?? []).map((v: string) => `- \`${v}\``).join('\n') + '\n\n'
    )
  }

  parts.push(
    `## OPEN TASKS FOR AI CODING TOOL\n\n` +
    `- [ ] Scaffold the project using the tech stack above\n` +
    `- [ ] Implement the Prisma schema delta\n` +
    `- [ ] Build Phase 1 features\n` +
    `- [ ] Set up all required env vars\n` +
    `- [ ] Write tests for core user stories\n`
  )

  return parts.join('')
}
