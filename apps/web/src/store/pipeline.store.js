import { create } from 'zustand';
import { NodeStatus, NODE_LABELS } from '@forgeos/shared';
import { api } from '../lib/api';
let logIdCounter = 0;
const defaultNodes = () => Array.from({ length: 5 }, (_, i) => ({
    id: i,
    label: NODE_LABELS[i] || `Node ${i}`,
    status: i === 0 ? NodeStatus.APPROVED : NodeStatus.LOCKED,
    payload: null,
    version: 1,
    regenerationCount: 0,
}));
export const usePipelineStore = create((set, get) => ({
    projectId: null,
    nodes: defaultNodes(),
    deployment: null,
    activePanel: null,
    demoMode: new URLSearchParams(window.location.search).get('demo') === 'true',
    sseConnected: false,
    consoleLogs: [],
    consoleOpen: false,
    kanbanOpen: false,
    initNodes: () => set({ nodes: defaultNodes(), deployment: null, activePanel: null, consoleLogs: [] }),
    setProjectId: (id) => set({ projectId: id }),
    handleSSEEvent: (event) => {
        const { nodes } = get();
        switch (event.type) {
            case 'NODE_STATUS':
                set({
                    nodes: nodes.map((n) => n.id === event.nodeId ? { ...n, status: event.status } : n),
                });
                break;
            case 'NODE_PAYLOAD':
                set({
                    nodes: nodes.map((n) => n.id === event.nodeId
                        ? { ...n, payload: event.payload, version: event.version }
                        : n),
                });
                break;
            case 'SHIPYARD_STEP': {
                // Update deployment state
                const stepMap = {
                    A: 'stepADone',
                    B: 'stepBDone',
                    C: 'stepCDone',
                    D: 'stepDDone',
                };
                if (event.status === 'DONE') {
                    const key = stepMap[event.step];
                    if (key) {
                        set((s) => ({
                            deployment: { ...s.deployment, [key]: true },
                        }));
                    }
                }
                break;
            }
            case 'DEPLOYMENT_COMPLETE':
                set((s) => ({
                    deployment: {
                        ...s.deployment,
                        githubRepoUrl: event.githubUrl,
                        doAppUrl: event.doAppUrl,
                        zipReady: event.zipReady,
                    },
                }));
                break;
            case 'LOG': {
                const entry = {
                    id: ++logIdCounter,
                    nodeId: event.nodeId,
                    level: event.level,
                    message: event.message,
                    timestamp: event.timestamp,
                };
                set((s) => ({
                    consoleLogs: [...s.consoleLogs.slice(-200), entry], // keep last 200
                    consoleOpen: event.level === 'error' ? true : s.consoleOpen, // auto-open on errors
                }));
                break;
            }
            case 'ERROR': {
                const errorEntry = {
                    id: ++logIdCounter,
                    nodeId: event.nodeId,
                    level: 'error',
                    message: event.message,
                    timestamp: new Date().toISOString(),
                };
                set((s) => {
                    const newNodes = [...s.nodes];
                    if (event.nodeId !== undefined && newNodes[event.nodeId]) {
                        newNodes[event.nodeId] = {
                            ...newNodes[event.nodeId],
                            status: NodeStatus.FAILED,
                            error: event.message
                        };
                    }
                    return {
                        consoleLogs: [...s.consoleLogs.slice(-200), errorEntry],
                        consoleOpen: true, // auto-open on errors
                        nodes: newNodes,
                    };
                });
                break;
            }
            case 'HEARTBEAT':
                break;
        }
    },
    openPanel: (nodeId) => set({ activePanel: nodeId }),
    closePanel: () => set({ activePanel: null }),
    setSseConnected: (connected) => set({ sseConnected: connected }),
    approveNode: async (nodeId, editedPayload) => {
        const { projectId } = get();
        if (!projectId)
            return;
        await api.approveNode(projectId, nodeId, editedPayload);
        set((s) => ({
            nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, status: NodeStatus.APPROVED } : n),
            activePanel: null,
            kanbanOpen: nodeId === 3 ? true : s.kanbanOpen,
        }));
    },
    rejectNode: async (nodeId, feedback) => {
        const { projectId } = get();
        if (!projectId)
            return;
        await api.rejectNode(projectId, nodeId, feedback);
        set((s) => ({
            nodes: s.nodes.map((n) => n.id === nodeId
                ? {
                    ...n,
                    status: NodeStatus.REGENERATING,
                    regenerationCount: n.regenerationCount + 1,
                }
                : n),
            activePanel: null,
        }));
    },
    retryNode: async (nodeId) => {
        const { projectId } = get();
        if (!projectId)
            return;
        await api.retryNode(projectId, nodeId);
        set((s) => ({
            nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, status: NodeStatus.QUEUED } : n),
        }));
    },
    startPipeline: async () => {
        const { projectId } = get();
        if (!projectId)
            return;
        await api.startPipeline(projectId);
        set((s) => ({
            nodes: s.nodes.map((n) => {
                if (n.id === 0)
                    return n; // input node stays APPROVED
                if (n.id === 1)
                    return { ...n, status: NodeStatus.QUEUED, payload: null, version: 1, regenerationCount: 0 };
                return { ...n, status: NodeStatus.LOCKED, payload: null, version: 1, regenerationCount: 0 };
            }),
            activePanel: null,
            deployment: null,
        }));
    },
    resumePipeline: async () => {
        const { projectId } = get();
        if (!projectId)
            return;
        await api.resumePipeline(projectId);
    },
    clearConsole: () => set({ consoleLogs: [] }),
    toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
    openKanban: () => set({ kanbanOpen: true }),
    closeKanban: () => set({ kanbanOpen: false }),
}));
