# ForgeOS Node Studio — PHASE 6: Demo Mode & Polish
# DigitalOcean Hackathon

---

## CONTEXT RECAP
ForgeOS is a multi-agent SaaS incubation platform. Phases 1–5 complete:
- Full monorepo, shared types, DB schema
- Backend API + SSE streaming + BullMQ pipeline
- All 3 LLM agents with RAG context
- Frontend canvas with live updates + HITL panels
- Shipyard: GitHub → DO App Platform → live URL
- Iterate Mode: branch + PR flow

**Your job in Phase 6**: The final phase before submission. Build demo mode (offline, pre-cached, 100% reliable for judges), add all visual polish, fix any rough edges, and verify the complete 30-second demo flow works flawlessly. This is a hackathon — judges will be watching.

---

## MCP SERVERS — USE THESE
- **shadcn** → use for any final UI components needed
- **context7** → framer-motion for animations, xyflow for edge animations

---

## TASK 1: Demo Cache (`scripts/demo-cache.ts`)

Pre-cached AI responses so demo mode requires zero external API calls.

```typescript
// This file exports DEMO_RESPONSES — a static fixture used when ?demo=true

export const DEMO_CONCEPT = "Client portal for a law firm"
export const DEMO_AGENCY_ID = process.env.DEMO_AGENCY_ID ?? 'demo-agency-cuid'

export const DEMO_RESPONSES = {
  node1: {
    targetAudience: "Small to mid-size law firms (5-50 attorneys) seeking to modernize client communication",
    audienceSegments: ["Solo practitioners", "Boutique litigation firms", "Corporate law practices"],
    mvpFeatures: [
      { name: "Secure client document portal", priority: "MUST", rationale: "Core legal requirement for confidential document exchange" },
      { name: "Matter status tracking", priority: "MUST", rationale: "Clients need real-time visibility into case progress" },
      { name: "Billing & invoice view", priority: "MUST", rationale: "Reduces admin calls about payment status" },
      { name: "Secure messaging", priority: "SHOULD", rationale: "Attorney-client privilege requires encrypted communication" },
      { name: "Appointment scheduling", priority: "COULD", rationale: "Reduces scheduling friction" }
    ],
    monetizationStrategy: "SaaS per-firm subscription: $149/mo for up to 10 attorneys, $299/mo for 11-50 attorneys. Annual plans at 20% discount.",
    marketDifferentiators: [
      "Purpose-built for legal vs generic portals",
      "Attorney-client privilege compliant architecture",
      "Bar association workflow integrations"
    ],
    riskFactors: [
      "Legal industry slow to adopt new technology",
      "High compliance requirements (state bar rules vary)",
      "Established competitors: Clio, MyCase"
    ]
  },
  node2: {
    userPersonas: [
      {
        name: "Sarah Chen",
        role: "Managing Partner",
        painPoints: ["Clients calling repeatedly for case updates", "Document exchange via unsecured email", "Manual billing inquiries"],
        goals: ["Reduce admin overhead", "Professional client experience", "Streamline document workflows"]
      },
      {
        name: "Marcus Webb",
        role: "Individual Client",
        painPoints: ["No visibility into case progress", "Difficulty sharing documents securely", "Unclear billing"],
        goals: ["Real-time case updates", "Easy document upload", "Clear cost tracking"]
      }
    ],
    coreUserStories: [
      {
        asA: "law firm client",
        iWantTo: "view the current status of my case",
        soThat: "I don't need to call my attorney for updates",
        acceptanceCriteria: ["Status shows current phase", "Timeline of past events visible", "Next steps clearly displayed"]
      },
      {
        asA: "attorney",
        iWantTo: "upload documents to a client's matter",
        soThat: "clients can securely access case files",
        acceptanceCriteria: ["Drag and drop upload", "Client notified via email", "Document versioning supported"]
      }
    ],
    dataEntities: [
      {
        name: "Matter",
        fields: [
          { name: "id", type: "String" },
          { name: "title", type: "String" },
          { name: "status", type: "String" },
          { name: "clientId", type: "String" },
          { name: "attorneyId", type: "String" }
        ],
        relations: ["Matter has many Documents", "Matter belongs to Client", "Matter has many Invoices"]
      },
      {
        name: "Document",
        fields: [
          { name: "id", type: "String" },
          { name: "filename", type: "String" },
          { name: "url", type: "String" },
          { name: "matterId", type: "String" },
          { name: "uploadedAt", type: "DateTime" }
        ],
        relations: ["Document belongs to Matter"]
      }
    ],
    integrations: ["DocuSign", "Stripe", "SendGrid", "Calendly"]
  },
  node3: {
    techStack: {
      frontend: ["Next.js 14", "TypeScript", "Tailwind CSS", "shadcn/ui", "React Query"],
      backend: ["Next.js API Routes", "Prisma ORM", "Zod", "NextAuth.js"],
      database: ["PostgreSQL", "Redis (session cache)"],
      infrastructure: ["DigitalOcean App Platform", "DO Managed PostgreSQL", "DO Spaces (documents)"]
    },
    prismaSchemaDelta: `model Matter {\n  id         String     @id @default(cuid())\n  title      String\n  status     MatterStatus @default(ACTIVE)\n  clientId   String\n  client     User       @relation(\"ClientMatters\", fields: [clientId], references: [id])\n  documents  Document[]\n  invoices   Invoice[]\n  createdAt  DateTime   @default(now())\n  updatedAt  DateTime   @updatedAt\n}\n\nmodel Document {\n  id         String   @id @default(cuid())\n  filename   String\n  url        String\n  matterId   String\n  matter     Matter   @relation(fields: [matterId], references: [id])\n  uploadedAt DateTime @default(now())\n}\n\nmodel Invoice {\n  id        String        @id @default(cuid())\n  amount    Float\n  status    InvoiceStatus @default(PENDING)\n  matterId  String\n  matter    Matter        @relation(fields: [matterId], references: [id])\n  dueDate   DateTime\n}\n\nenum MatterStatus { ACTIVE ON_HOLD CLOSED }\nenum InvoiceStatus { PENDING PAID OVERDUE }`,
    phase1Features: [
      { feature: "Client authentication (NextAuth)", estimatedDays: 2 },
      { feature: "Matter dashboard", estimatedDays: 3 },
      { feature: "Document upload & storage", estimatedDays: 3 },
      { feature: "Invoice viewing", estimatedDays: 2 }
    ],
    phase2Features: [
      { feature: "Secure messaging", estimatedDays: 4 },
      { feature: "Stripe payment integration", estimatedDays: 3 },
      { feature: "DocuSign e-signature", estimatedDays: 5 }
    ],
    apiEndpoints: [
      { method: "GET", path: "/api/matters", description: "List client's matters" },
      { method: "POST", path: "/api/documents", description: "Upload document to matter" },
      { method: "GET", path: "/api/invoices/:id", description: "Get invoice details" }
    ],
    envVarsRequired: ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "DO_SPACES_KEY", "DO_SPACES_SECRET", "STRIPE_SECRET_KEY"]
  },
  node4: {
    githubRepoUrl: "https://github.com/forgeos-demo/client-portal-law-firm-abc123",
    doAppUrl: "https://client-portal-law-abc123.ondigitalocean.app",
    buildStatus: "ACTIVE"
  }
}

// Timing for demo mode animations (milliseconds)
export const DEMO_TIMING = {
  node1ProcessingMs: 3000,
  node2ProcessingMs: 2500,
  node3ProcessingMs: 3500,
  shipyardStepMs: 1200,   // each sub-step
}
```

---

## TASK 2: Demo Mode in the Backend

In the BullMQ worker, check for demo mode:

```typescript
// At the top of the worker job handler:
const isDemoProject = job.data.concept === DEMO_CONCEPT || job.data.demoMode === true

if (isDemoProject) {
  const timing = DEMO_TIMING[`node${job.data.nodeId}ProcessingMs`] ?? 2000
  await new Promise(r => setTimeout(r, timing))
  const demoPayload = DEMO_RESPONSES[`node${job.data.nodeId}`]
  // Treat as real output from here — same DB updates and SSE events
  return demoPayload
}
// else: run real agent...
```

Also: in the Shipyard, if `demoMode`, skip all GitHub/DO API calls and use `DEMO_RESPONSES.node4` with simulated step delays.

---

## TASK 3: Demo Mode in the Frontend

In `App.tsx` / `Studio.tsx`:

```typescript
// Detect demo mode
const demoMode = new URLSearchParams(window.location.search).get('demo') === 'true'

// Show DEMO MODE banner:
{demoMode && (
  <div className="demo-banner">
    ⚡ DEMO MODE — All AI calls are pre-cached. No external APIs used.
  </div>
)}
```

Banner style:
```css
.demo-banner {
  background: linear-gradient(90deg, var(--accent-warning), #d97706);
  color: #000;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  padding: 4px 0;
  letter-spacing: 0.05em;
}
```

---

## TASK 4: Visual Polish Pass

Go through every component and apply these fixes:

### Canvas
- [ ] Add `ReactFlow` `<Background>` component with dot variant and dark color
- [ ] Add `ReactFlow` `<MiniMap>` with dark node colors
- [ ] Add `ReactFlow` `<Controls>` with dark styling
- [ ] Ensure canvas fills viewport height (no scrollbars)
- [ ] Add subtle canvas vignette: radial gradient overlay at edges

### Node Cards
- [ ] PROCESSING state: add a horizontally scanning gradient bar (`@keyframes scan`)
- [ ] REVIEW state: add subtle pulsing border glow using `@keyframes glow`
- [ ] APPROVED state: brief "pop" scale animation on transition using Framer Motion
- [ ] All nodes: add hover tooltip showing full status name
- [ ] Node labels use JetBrains Mono — verify font is loading

### Animated Edges
- [ ] When source node is APPROVED and target is PROCESSING: animate 3 dots flowing along edge
- [ ] Dot color: `var(--accent-primary)` (#00d4ff)
- [ ] Use SVG `offset-path` + `offset-distance` CSS animation
- [ ] All other states: static edge, color `var(--border)` (#2a2a3d)

### HITL Panel
- [ ] Panel slides in with Framer Motion (x: from 100% to 0)
- [ ] Backdrop blur behind panel when open
- [ ] Monaco editor: set `minimap: { enabled: false }`, `fontSize: 13`, `lineNumbers: 'on'`
- [ ] Invalid JSON in editor: show red warning banner above action buttons
- [ ] Approve button: pulse animation when JSON is valid to draw user's eye

### Dashboard
- [ ] Empty state: "No projects yet. Launch your first SaaS idea." with big CTA button
- [ ] Project cards: status chip with correct colors matching node status palette
- [ ] Hover state on project cards: slight elevation shadow

### Shipyard Panel
- [ ] Each step: staggered entrance animation (Framer Motion, 0.15s delay between steps)
- [ ] DONE step: green checkmark with scale bounce animation
- [ ] ACTIVE step: spinning loader
- [ ] LOCKED step: opacity-30, no animation
- [ ] After completion: GitHub + Live URL buttons animate in with a "tada" scale effect
- [ ] Download button: shows spinner while ZIP is being generated, then activates

---

## TASK 5: Error States & Loading States

Don't leave any blank screens:

- [ ] If SSE fails to connect: show "Connection lost. Reconnecting..." banner
- [ ] If API call fails: sonner toast with error message + red styling
- [ ] If Gradient API returns malformed JSON: worker retries up to 3x, then FAILED state
- [ ] If DO build times out (20 polls): Shipyard FAILED state with "Build timed out — check DO console" message
- [ ] Dashboard loading: skeleton cards (CSS shimmer effect)
- [ ] Studio loading: "Loading pipeline..." centered overlay with spinner

---

## TASK 6: Performance & Mobile

- [ ] React Query: set `staleTime: 30_000` for project list (don't over-fetch)
- [ ] Canvas: `nodesDraggable: false`, `elementsSelectable: false` for perf
- [ ] On mobile (< 768px): hide minimap, make HITL panel full-screen drawer
- [ ] Check for layout overflow on 1280px viewport (hackathon judge's laptop)
- [ ] Run Lighthouse in browser — fix any obvious perf issues

---

## TASK 7: README.md for Submission

Write a compelling `README.md` at project root:

```markdown
# ForgeOS Node Studio

> Transform a raw SaaS idea into a deployed, production-ready app in minutes.

## What It Does
[2-paragraph description of the platform]

## Live Demo
- 🌐 [Demo URL] — try with ?demo=true for offline mode
- 📹 [Demo Video URL]

## The Pipeline
[Brief description of each of the 5 nodes]

## Tech Stack
[Table of technologies used]

## DigitalOcean Services Used
- DO Gradient API (Llama 3.1 + BGE embeddings)
- DO Managed PostgreSQL + pgvector
- DO Managed Redis
- DO App Platform

## Running Locally
[Quick start steps]

## Architecture
[Link to or embed architecture diagram]
```

---

## TASK 8: Final Demo Run-Through

Run the complete 30-second hackathon demo flow and verify each beat:

```
0:00 — Open http://localhost:5173?demo=true
0:02 — Dashboard visible, click "+ New Project"  
0:05 — Type "Client portal for a law firm" → click Deploy
0:08 — Studio opens, Node 1 shows PROCESSING (scan bar animating)
0:11 — Node 1 transitions to REVIEW (border pulses)
0:13 — Click Node 1 → HITL drawer slides in, Strategist JSON visible
0:17 — Click Reject, type "Focus more on B2B law firms" → Regenerate
0:20 — Node 1 shows REGENERATING, then REVIEW again (v2)
0:23 — Click Approve → Node 1 green, Node 2 starts PROCESSING
0:26 — Skip ahead (pre-approved in demo) → Node 4 Shipyard fires
0:28 — Shipyard steps tick green one by one
0:32 — DEPLOYMENT_COMPLETE: GitHub URL + live app URL appear
0:35 — Click "View Live App" → ondigitalocean.app opens ✓
```

If any beat takes longer than shown, optimize the demo timing values in `DEMO_TIMING`.

---

## PHASE 6 COMPLETION CHECKLIST

- [ ] `?demo=true` runs complete pipeline with zero external API calls
- [ ] Demo banner visible in demo mode
- [ ] All 30-second demo beats work on first try, every time
- [ ] No console errors in browser
- [ ] No TypeScript errors: `pnpm typecheck`
- [ ] Canvas fills viewport, no overflow, no scrollbars
- [ ] Node state transitions are smooth and animated
- [ ] HITL panel opens/closes with animation
- [ ] Shipyard steps animate in sequence
- [ ] Mobile layout works on 375px viewport
- [ ] README.md written and accurate
- [ ] `docker-compose up && pnpm seed && pnpm dev` works on fresh clone in under 5 minutes

---

## SUBMISSION NOTES

For the DigitalOcean hackathon submission, highlight these integrations:
1. **DO Gradient API** — Llama 3.1 8B for all agent generation + BGE for embeddings
2. **DO Managed PostgreSQL** — with pgvector extension for RAG memory
3. **DO Managed Redis** — BullMQ job queue + SSE pub/sub
4. **DO App Platform** — automated deployment target for generated apps

These are the judging criteria. Make sure every DO service is clearly visible in the UI and README.
```

---

*End of Phase 6 — ForgeOS Node Studio is ready to ship. 🚀*
