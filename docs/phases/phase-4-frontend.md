# ForgeOS Node Studio — PHASE 4: Frontend
# DigitalOcean Hackathon

---

## CONTEXT RECAP
ForgeOS is a multi-agent SaaS incubation platform. Phases 1–3 complete:
- Full backend API with all routes running
- SSE streaming tested and working end-to-end
- All 3 LLM agents (Strategist, Analyst, Tech Lead) producing real JSON
- RAG context from pgvector seeded and queried
- Approve/reject HITL loop fully functional in backend

**Your job in Phase 4**: Build the entire frontend — the React Flow pipeline canvas, the HITL review panel with Monaco JSON editor, the Dashboard project list, and wire everything to live SSE and API. By the end, a user can open the browser, enter a concept, watch nodes animate through states in real-time, review/edit AI output in a drawer, and approve or reject with feedback.

---

## MCP SERVERS — USE THESE
- **shadcn** → use for all UI components (Drawer, Button, Badge, Textarea, Toast etc.)
- **context7** → use for @xyflow/react v12 custom nodes, Zustand, Framer Motion, TanStack Query v5
- **context7** → especially important for @xyflow/react — it changed significantly in v12

---

## DESIGN SYSTEM

Commit to this aesthetic — dark industrial terminal meets SaaS. Every component must follow it.

```css
/* globals.css — extend Tailwind with these CSS vars */
:root {
  --bg-base: #0a0a0f;
  --bg-surface: #12121a;
  --bg-elevated: #1a1a28;
  --border: #2a2a3d;
  --accent-primary: #00d4ff;    /* electric cyan */
  --accent-secondary: #7c3aed;  /* violet */
  --accent-success: #10b981;    /* emerald */
  --accent-warning: #f59e0b;    /* amber */
  --accent-danger: #ef4444;     /* red */
  --text-primary: #f0f0f0;
  --text-muted: #6b7280;
}
```

**Fonts**: Import from Google Fonts in `index.html`:
- `JetBrains Mono` (weights 400, 600) — node labels, titles, badges
- `Inter` (weights 400, 500) — body text, descriptions

**Canvas background**: CSS dot grid pattern:
```css
.canvas-bg {
  background-color: var(--bg-base);
  background-image: radial-gradient(circle, #2a2a3d 1px, transparent 1px);
  background-size: 28px 28px;
}
```

---

## TASK 1: Install All Frontend Dependencies

```bash
cd apps/web
pnpm add @xyflow/react@latest zustand @tanstack/react-query @monaco-editor/react
pnpm add tailwindcss tailwind-animate lucide-react sonner framer-motion
pnpm add @radix-ui/react-dialog @radix-ui/react-drawer  # for HITL panel
# Use shadcn MCP to add components: Button, Badge, Drawer, Textarea, Separator, Tooltip
```

---

## TASK 2: Zustand Store (`apps/web/src/store/pipeline.store.ts`)

```typescript
import { create } from 'zustand'
import { NodeStatus, NODE_LABELS, MAX_REGENERATIONS } from '@forgeos/shared'
import type { PipelineNodeState, SSEEvent, Deployment } from '@forgeos/shared'
import { api } from '../lib/api'

interface PipelineStore {
  // State
  projectId: string | null
  nodes: PipelineNodeState[]       // Always 5 nodes (0-4)
  deployment: Partial<Deployment> | null
  activePanel: number | null       // which node's drawer is open
  demoMode: boolean

  // Actions
  initNodes: () => void
  setProjectId: (id: string) => void
  handleSSEEvent: (event: SSEEvent) => void
  openPanel: (nodeId: number) => void
  closePanel: () => void
  approveNode: (nodeId: number, editedPayload?: Record<string, unknown>) => Promise<void>
  rejectNode: (nodeId: number, feedback: string) => Promise<void>
}

const defaultNodes = (): PipelineNodeState[] =>
  Array.from({ length: 5 }, (_, i) => ({
    id: i,
    label: NODE_LABELS[i],
    status: i === 0 ? NodeStatus.APPROVED : NodeStatus.LOCKED,
    payload: null,
    version: 1,
    regenerationCount: 0,
  }))

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  projectId: null,
  nodes: defaultNodes(),
  deployment: null,
  activePanel: null,
  demoMode: new URLSearchParams(window.location.search).get('demo') === 'true',

  initNodes: () => set({ nodes: defaultNodes(), deployment: null, activePanel: null }),

  setProjectId: (id) => set({ projectId: id }),

  handleSSEEvent: (event) => {
    const { nodes } = get()
    switch (event.type) {
      case 'NODE_STATUS':
        set({
          nodes: nodes.map(n =>
            n.id === event.nodeId ? { ...n, status: event.status } : n
          )
        })
        break
      case 'NODE_PAYLOAD':
        set({
          nodes: nodes.map(n =>
            n.id === event.nodeId
              ? { ...n, payload: event.payload, version: event.version }
              : n
          )
        })
        break
      case 'SHIPYARD_STEP':
        // Update deployment state
        const stepMap: Record<string, keyof Deployment> = {
          A: 'stepADone', B: 'stepBDone', C: 'stepCDone', D: 'stepDDone'
        }
        if (event.status === 'DONE') {
          set(s => ({ deployment: { ...s.deployment, [stepMap[event.step]]: true } }))
        }
        break
      case 'DEPLOYMENT_COMPLETE':
        set(s => ({
          deployment: {
            ...s.deployment,
            githubRepoUrl: event.githubUrl,
            doAppUrl: event.doAppUrl,
            zipReady: event.zipReady,
          }
        }))
        break
    }
  },

  openPanel: (nodeId) => set({ activePanel: nodeId }),
  closePanel: () => set({ activePanel: null }),

  approveNode: async (nodeId, editedPayload) => {
    const { projectId } = get()
    if (!projectId) return
    await api.approveNode(projectId, nodeId, editedPayload)
    set(s => ({
      nodes: s.nodes.map(n => n.id === nodeId ? { ...n, status: NodeStatus.APPROVED } : n),
      activePanel: null,
    }))
  },

  rejectNode: async (nodeId, feedback) => {
    const { projectId } = get()
    if (!projectId) return
    await api.rejectNode(projectId, nodeId, feedback)
    set(s => ({
      nodes: s.nodes.map(n =>
        n.id === nodeId
          ? { ...n, status: NodeStatus.REGENERATING, regenerationCount: n.regenerationCount + 1 }
          : n
      ),
      activePanel: null,
    }))
  },
}))
```

---

## TASK 3: API Client (`apps/web/src/lib/api.ts`)

```typescript
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  createProject: (body: { concept: string; agencyId: string; mode?: string }) =>
    request<{ projectId: string }>('/api/projects', { method: 'POST', body: JSON.stringify(body) }),

  getProject: (id: string) =>
    request<Project>(`/api/projects/${id}`),

  listProjects: (agencyId: string, page = 1) =>
    request<{ projects: Project[]; total: number }>(`/api/projects?agencyId=${agencyId}&page=${page}`),

  approveNode: (projectId: string, nodeId: number, editedPayload?: Record<string, unknown>) =>
    request(`/api/projects/${projectId}/nodes/${nodeId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ editedPayload }),
    }),

  rejectNode: (projectId: string, nodeId: number, feedback: string) =>
    request(`/api/projects/${projectId}/nodes/${nodeId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  downloadLocalStack: (projectId: string) =>
    `${BASE}/api/projects/${projectId}/download`,
}
```

---

## TASK 4: SSE Hook (`apps/web/src/hooks/useSSE.ts`)

```typescript
import { useEffect, useRef } from 'react'
import type { SSEEvent } from '@forgeos/shared'

export function useSSE(projectId: string | null, onEvent: (event: SSEEvent) => void) {
  const esRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const lastEventIdRef = useRef<string>('')

  useEffect(() => {
    if (!projectId) return

    function connect() {
      const url = `http://localhost:3001/api/projects/${projectId}/stream`
      // EventSource doesn't support custom headers natively
      // Pass Last-Event-ID as query param as fallback
      const fullUrl = lastEventIdRef.current
        ? `${url}?lastEventId=${lastEventIdRef.current}`
        : url

      const es = new EventSource(fullUrl)
      esRef.current = es

      es.onmessage = (e) => {
        if (e.lastEventId) lastEventIdRef.current = e.lastEventId
        retryCountRef.current = 0 // reset backoff on success
        try {
          const event: SSEEvent = JSON.parse(e.data)
          onEvent(event)
        } catch {}
      }

      es.onerror = () => {
        es.close()
        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
        retryCountRef.current++
        setTimeout(connect, delay)
      }
    }

    connect()
    return () => { esRef.current?.close() }
  }, [projectId])
}
```

---

## TASK 5: React Flow Custom Nodes

### `AgentNode.tsx` — used for nodes 1, 2, 3

Each node card must visually reflect its status. Use Framer Motion for state transitions.

```
Visual states:
LOCKED:       opacity-40, grayscale, padlock icon, no glow
QUEUED:       amber border pulse animation, clock icon  
PROCESSING:   blue glow, animated scan-line bar across card, spinner icon
REVIEW:       cyan border, pulsing "Review Ready" badge, cursor-pointer, click to open panel
APPROVED:     emerald border, checkmark icon, solid
FAILED:       red border, X icon
REGENERATING: amber glow, rotating refresh icon, "Regenerating v{n}..." label
```

Node card structure:
```
┌─────────────────────────────┐
│ [status icon]  Node Label   │  ← JetBrains Mono font
│                             │
│  [status badge]             │  ← e.g. "AWAITING REVIEW" / "PROCESSING"
│                             │
│  v{version} · {timestamp}   │  ← shown when payload exists
│                             │
│  [processing scan bar]      │  ← animated, only in PROCESSING state
└─────────────────────────────┘
```

Card dimensions: width 220px, height auto (min 100px)
glassmorphism: `backdrop-filter: blur(12px)`, `background: rgba(18,18,26,0.85)`
border radius: 12px

### `InputNode.tsx` — Node 0 (Concept Input)

```
┌─────────────────────────────┐
│ 💡 Concept Input            │
│                             │
│ [concept text displayed]    │
│                             │
│ ✓ ACTIVE                    │
└─────────────────────────────┘
```

### `ShipyardNode.tsx` — Node 4

Show sub-step progress:
```
┌─────────────────────────────┐
│ ⚙️ The Shipyard             │
│                             │
│ ○ / ✓ Clone boilerplate    │
│ ○ / ✓ Inject schema        │
│ ○ / ✓ Push to GitHub       │
│ ○ / ✓ Deploy to DO         │
│                             │
│ [LOCKED / IN PROGRESS / ✓] │
└─────────────────────────────┘
```

### `AnimatedEdge.tsx` — custom edge

For edges between APPROVED node and next node's PROCESSING state, animate flowing dots:
- Use SVG `<circle>` with CSS animation along the path
- Dots color: `var(--accent-primary)` 
- Only animate when upstream node is APPROVED and downstream is PROCESSING
- Static muted line otherwise

---

## TASK 6: Pipeline Canvas (`apps/web/src/components/canvas/PipelineCanvas.tsx`)

```typescript
// Use @xyflow/react v12 — check context7 for v12 API changes
// 
// Layout: 5 nodes arranged horizontally with gaps
// Node positions (x, y):
//   Node 0: (50, 200)
//   Node 1: (350, 200)
//   Node 2: (650, 200)
//   Node 3: (950, 200)
//   Node 4: (1250, 200)
//
// Edges: 0→1, 1→2, 2→3, 3→4
// Use AnimatedEdge as edge type
//
// Canvas config:
//   - nodesDraggable: false (fixed layout)
//   - zoomOnScroll: true
//   - panOnDrag: true
//   - fitView: true on load
//   - Background: dot grid pattern (use ReactFlow Background component)
//   - MiniMap: show with dark theme
//
// On node click (REVIEW status only): store.openPanel(nodeId)
```

---

## TASK 7: HITL Panel (`apps/web/src/components/panels/HITLPanel.tsx`)

Slide-in drawer from the right. Uses shadcn Drawer component.

```
Width: 600px (or 50vw on desktop, full screen on mobile)

┌────────────────────────────────────────────────────┐
│ The Strategist  ·  v2 of 5           [✕]          │  ← header
├────────────────────────────────────────────────────┤
│ AI Output                                          │
│ ┌──────────────────────────────────────────────┐   │
│ │  Monaco Editor                               │   │  ← 400px height
│ │  language="json"                             │   │
│ │  theme="vs-dark"                             │   │
│ │  readOnly=false (user can edit)              │   │
│ └──────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────┤
│ Feedback for regeneration (optional)               │
│ ┌──────────────────────────────────────────────┐   │
│ │  <textarea placeholder="Focus more on B2B…" │   │
│ └──────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────┤
│ [Reject & Regenerate ↺]    [✓ Approve & Continue] │
│  3 of 5 attempts remaining                         │
└────────────────────────────────────────────────────┘

States:
- Approve button: disabled if JSON in editor is invalid
- Reject button: disabled if no feedback text entered
- Both disabled while API call is in flight (show spinner)
- Show toast via sonner on success/error
```

---

## TASK 8: Dashboard Page (`apps/web/src/pages/Dashboard.tsx`)

The project list / landing screen before entering Studio.

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ ForgeOS Node Studio          [+ New Project]               │  ← header
├─────────────────────────────────────────────────────────────────┤
│  Your Projects                                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ B2B Invoice Tool for Freelancers              COMPLETED  │   │
│  │ Created 2 days ago · 4 agents · Deployed ✓             │   │
│  │                               [Open Studio] [View App]  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Client Portal for Marketing Agency         AWAITING...  │   │
│  │ Created 1 hour ago · Node 2: Business Analyst          │   │
│  │                                         [Continue →]   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## TASK 9: Studio Page (`apps/web/src/pages/Studio.tsx`)

Main page that hosts the pipeline canvas + panels.

```typescript
// Route: /studio/:projectId
// On mount:
//   1. Fetch project from API (React Query)
//   2. Hydrate Zustand store with existing node states from DB
//   3. Start SSE connection via useSSE hook
//   4. Render PipelineCanvas + HITLPanel

// Layout:
//   Full viewport height
//   Header bar: project concept title + back button + DEMO MODE badge (if ?demo=true)
//   Canvas: flex-1, fills remaining space
//   HITLPanel: slides over canvas (not push layout)
//   ShipyardPanel: shown as overlay when node 4 is active
```

---

## TASK 10: New Project Modal

On Dashboard, "+ New Project" button opens a modal:

```
┌──────────────────────────────────────────────────┐
│  Launch New Project                   [✕]        │
├──────────────────────────────────────────────────┤
│  Your SaaS Idea                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ e.g. "Client portal for a law firm"        │  │  ← textarea, min 10 chars
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Tips: Be specific. Include the target audience  │
│  and the core problem you're solving.            │
│                                                  │
│                    [🚀 Deploy to Pipeline]       │
└──────────────────────────────────────────────────┘
```

On submit:
1. Call `api.createProject()`
2. Navigate to `/studio/:newProjectId`
3. Show loading state while navigating

---

## PHASE 4 COMPLETION CHECKLIST

- [ ] Dashboard renders list of projects fetched from API
- [ ] "+ New Project" modal submits and navigates to Studio
- [ ] Pipeline canvas renders 5 nodes with correct initial states
- [ ] SSE events update node states in real-time (watch node animate through QUEUED → PROCESSING → REVIEW)
- [ ] Clicking a REVIEW node opens HITL drawer with Monaco editor populated with JSON
- [ ] User can edit JSON in Monaco and click Approve → backend receives edited payload
- [ ] Reject with feedback → node shows REGENERATING → then REVIEW again with v2
- [ ] Animated edges flow when pipeline is active
- [ ] Shipyard node shows sub-step progress as steps complete
- [ ] DEMO MODE badge shows when ?demo=true
- [ ] Mobile responsive — panels go full-screen on narrow viewport
- [ ] Zero TypeScript errors: `pnpm typecheck`
- [ ] sonner toasts show on approve/reject success and API errors
