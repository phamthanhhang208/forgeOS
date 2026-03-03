import { create } from 'zustand'
import { NodeStatus, NODE_LABELS } from '@forgeos/shared'
import type { PipelineNodeState, SSEEvent, Deployment } from '@forgeos/shared'
import { api } from '../lib/api'

interface PipelineStore {
    // State
    projectId: string | null
    nodes: PipelineNodeState[] // Always 5 nodes (0-4)
    deployment: Partial<Deployment> | null
    activePanel: number | null // which node's drawer is open
    demoMode: boolean

    // Actions
    initNodes: () => void
    setProjectId: (id: string) => void
    handleSSEEvent: (event: SSEEvent) => void
    openPanel: (nodeId: number) => void
    closePanel: () => void
    approveNode: (
        nodeId: number,
        editedPayload?: Record<string, unknown>
    ) => Promise<void>
    rejectNode: (nodeId: number, feedback: string) => Promise<void>
}

const defaultNodes = (): PipelineNodeState[] =>
    Array.from({ length: 5 }, (_, i) => ({
        id: i,
        label: NODE_LABELS[i as keyof typeof NODE_LABELS] || `Node ${i}`,
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

    initNodes: () =>
        set({ nodes: defaultNodes(), deployment: null, activePanel: null }),

    setProjectId: (id) => set({ projectId: id }),

    handleSSEEvent: (event) => {
        const { nodes } = get()
        switch (event.type) {
            case 'NODE_STATUS':
                set({
                    nodes: nodes.map((n) =>
                        n.id === event.nodeId ? { ...n, status: event.status } : n
                    ),
                })
                break
            case 'NODE_PAYLOAD':
                set({
                    nodes: nodes.map((n) =>
                        n.id === event.nodeId
                            ? { ...n, payload: event.payload, version: event.version }
                            : n
                    ),
                })
                break
            case 'SHIPYARD_STEP': {
                // Update deployment state
                const stepMap: Record<string, keyof Deployment> = {
                    A: 'stepADone',
                    B: 'stepBDone',
                    C: 'stepCDone',
                    D: 'stepDDone',
                }
                if (event.status === 'DONE') {
                    const key = stepMap[event.step]
                    if (key) {
                        set((s) => ({
                            deployment: { ...s.deployment, [key]: true },
                        }))
                    }
                }
                break
            }
            case 'DEPLOYMENT_COMPLETE':
                set((s) => ({
                    deployment: {
                        ...s.deployment,
                        githubRepoUrl: event.githubUrl,
                        doAppUrl: event.doAppUrl,
                        zipReady: event.zipReady,
                    },
                }))
                break
            case 'ERROR':
                // Optional handle error UI state here. We'll handle toast component-side.
                break
            case 'HEARTBEAT':
                break
        }
    },

    openPanel: (nodeId) => set({ activePanel: nodeId }),
    closePanel: () => set({ activePanel: null }),

    approveNode: async (nodeId, editedPayload) => {
        const { projectId } = get()
        if (!projectId) return
        await api.approveNode(projectId, nodeId, editedPayload)
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === nodeId ? { ...n, status: NodeStatus.APPROVED } : n
            ),
            activePanel: null,
        }))
    },

    rejectNode: async (nodeId, feedback) => {
        const { projectId } = get()
        if (!projectId) return
        await api.rejectNode(projectId, nodeId, feedback)
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === nodeId
                    ? {
                        ...n,
                        status: NodeStatus.REGENERATING,
                        regenerationCount: n.regenerationCount + 1,
                    }
                    : n
            ),
            activePanel: null,
        }))
    },
}))
