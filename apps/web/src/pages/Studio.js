import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, WifiOff, Play, Pause, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { usePipelineStore } from '../store/pipeline.store';
import { NodeStatus } from '@forgeos/shared';
import { useSSE } from '../hooks/useSSE';
import { PipelineCanvas } from '../components/canvas/PipelineCanvas';
import { HITLPanel } from '../components/panels/HITLPanel';
import { KanbanModal } from '../components/modals/KanbanModal';
import { ConsolePanel } from '../components/panels/ConsolePanel';
export function Studio() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const setProjectId = usePipelineStore((s) => s.setProjectId);
    const initNodes = usePipelineStore((s) => s.initNodes);
    const handleSSEEvent = usePipelineStore((s) => s.handleSSEEvent);
    const demoMode = usePipelineStore((s) => s.demoMode);
    const sseConnected = usePipelineStore((s) => s.sseConnected);
    const nodes = usePipelineStore((s) => s.nodes);
    const startPipeline = usePipelineStore((s) => s.startPipeline);
    const approveNode = usePipelineStore((s) => s.approveNode);
    const retryNode = usePipelineStore((s) => s.retryNode);
    const resumePipeline = usePipelineStore((s) => s.resumePipeline);
    const openKanban = usePipelineStore((s) => s.openKanban);
    const hydratedOnce = useRef(false);
    const reviewReadyNode = nodes.find((n) => n.status === NodeStatus.REVIEW);
    const failedNode = nodes.find((n) => n.status === NodeStatus.FAILED);
    const techLeadNode = nodes[3];
    const hasKanbanData = techLeadNode?.status === NodeStatus.APPROVED; // Tech Lead is Node 3
    const hasActiveNodes = nodes.some((n) => n.status === NodeStatus.QUEUED || n.status === NodeStatus.PROCESSING);
    // Poll DB when nodes are actively running so missed SSE events self-correct
    const { data: project, isLoading, error } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => api.getProject(projectId),
        enabled: !!projectId,
        refetchInterval: hasActiveNodes ? 3000 : false,
    });
    // Initialize project ID on mount
    useEffect(() => {
        if (projectId) {
            setProjectId(projectId);
        }
        return () => {
            setProjectId('');
            initNodes(); // Only clear when unmounting/leaving the studio
            hydratedOnce.current = false;
        };
    }, [projectId, setProjectId, initNodes]);
    // Hydrate node states from DB fetch
    useEffect(() => {
        if (project && project.id === projectId) {
            const outputs = project.agentOutputs;
            if (outputs) {
                // Hydrate best status per node (latest version wins)
                const bestByNode = new Map();
                for (const output of outputs) {
                    const prev = bestByNode.get(output.nodeId);
                    if (!prev || output.version > prev.version) {
                        bestByNode.set(output.nodeId, output);
                    }
                }
                bestByNode.forEach((output) => {
                    handleSSEEvent({
                        type: 'NODE_STATUS',
                        nodeId: output.nodeId,
                        status: output.status,
                    });
                    if (output.jsonPayload && Object.keys(output.jsonPayload).length > 0) {
                        handleSSEEvent({
                            type: 'NODE_PAYLOAD',
                            nodeId: output.nodeId,
                            version: output.version,
                            payload: output.jsonPayload,
                        });
                    }
                });
                // Enforce Linear Progression UI Rule:
                // If the pipeline is currently at node X (project.currentNode), 
                // all nodes before X MUST visually appear as APPROVED to prevent UI glitching
                // caused by abandoned 'QUEUED' versions from retries.
                const currentNode = project.currentNode || 0;
                for (let i = 0; i < currentNode; i++) {
                    handleSSEEvent({
                        type: 'NODE_STATUS',
                        nodeId: i,
                        status: NodeStatus.APPROVED,
                    });
                }
                // Synthetic console logs from DB state — only on first load
                if (!hydratedOnce.current) {
                    const now = new Date().toISOString();
                    const nodeNames = { 1: 'Strategist', 2: 'Business Analyst', 3: 'Tech Lead', 4: 'Shipyard' };
                    bestByNode.forEach((output) => {
                        handleSSEEvent({
                            type: 'LOG',
                            nodeId: output.nodeId,
                            level: output.status === 'FAILED' ? 'error' : 'info',
                            message: `[Restored] ${nodeNames[output.nodeId] ?? `Node ${output.nodeId}`}: ${output.status} (v${output.version})`,
                            timestamp: now,
                        });
                    });
                    hydratedOnce.current = true;
                }
            }
            if (project.deployment) {
                const dep = project.deployment;
                handleSSEEvent({
                    type: 'DEPLOYMENT_COMPLETE',
                    githubUrl: dep.githubRepoUrl || '',
                    doAppUrl: dep.doAppUrl || '',
                    zipReady: !!dep.zipPath,
                });
                // Hydrate individual shipyard steps from deployment flags
                const stepFlags = [
                    { step: 'A', done: dep.stepADone, label: 'Clone & inject schema' },
                    { step: 'B', done: dep.stepBDone, label: 'Push to GitHub' },
                    { step: 'C', done: dep.stepCDone, label: 'Deploy to DigitalOcean' },
                    { step: 'D', done: dep.stepDDone, label: 'Build active' },
                ];
                const now = new Date().toISOString();
                for (const sf of stepFlags) {
                    if (sf.done) {
                        handleSSEEvent({ type: 'SHIPYARD_STEP', step: sf.step, status: 'DONE' });
                        handleSSEEvent({
                            type: 'LOG', nodeId: 4, level: 'info',
                            message: `[Restored] Step ${sf.step}: ${sf.label} — done`,
                            timestamp: now,
                        });
                    }
                }
                // Log current build status
                handleSSEEvent({
                    type: 'LOG', nodeId: 4, level: dep.buildStatus === 'ACTIVE' ? 'info' : 'warn',
                    message: `[Restored] Shipyard build status: ${dep.buildStatus}`,
                    timestamp: now,
                });
            }
        }
    }, [project, projectId, handleSSEEvent]);
    // Start SSE stream
    useSSE(projectId || null, handleSSEEvent);
    if (isLoading) {
        return (_jsx("div", { className: "h-screen bg-bg-base flex items-center justify-center", children: _jsx(Loader2, { className: "animate-spin text-accent-primary w-8 h-8" }) }));
    }
    if (error || !project) {
        return (_jsxs("div", { className: "h-screen bg-bg-base flex flex-col items-center justify-center text-text-primary gap-4", children: [_jsx("p", { children: "Project not found or failed to load." }), _jsx("button", { onClick: () => navigate('/'), className: "bg-bg-elevated border border-border px-4 py-2 rounded-md hover:bg-border transition-colors", children: "Return to Dashboard" })] }));
    }
    return (_jsxs("div", { className: "h-screen w-full flex flex-col bg-bg-base text-text-primary overflow-hidden", children: [!sseConnected && (_jsxs("div", { className: "bg-accent-danger/10 border-b border-accent-danger/30 px-4 py-1.5 flex items-center justify-center gap-2 shrink-0 z-30", children: [_jsx(WifiOff, { size: 14, className: "text-accent-danger" }), _jsx("span", { className: "text-accent-danger text-xs font-semibold", children: "Connection lost. Reconnecting..." })] })), _jsxs("header", { className: "h-14 border-b border-border bg-bg-surface flex items-center justify-between px-4 shrink-0 z-20", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("button", { onClick: () => navigate('/'), className: "text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-sm font-semibold", children: [_jsx(ArrowLeft, { size: 16 }), " Dashboard"] }), _jsx("div", { className: "h-4 w-[1px] bg-border" }), _jsx("h1", { className: "text-sm font-mono truncate max-w-xl", children: project.concept })] }), _jsxs("div", { className: "flex items-center gap-2 absolute left-1/2 -translate-x-1/2", children: [hasKanbanData && (_jsx("button", { onClick: openKanban, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary bg-bg-base border border-border rounded-md hover:bg-bg-elevated transition-colors", title: "Open Kanban Board", children: "\uD83D\uDCCB Kanban Board" })), _jsxs("button", { onClick: () => alert('Pause functionality coming soon!'), className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary bg-bg-base border border-border rounded-md hover:bg-bg-elevated transition-colors", title: "Pause Pipeline", children: [_jsx(Pause, { size: 12 }), " Pause"] }), _jsxs("button", { onClick: () => startPipeline(), className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary bg-bg-base border border-border rounded-md hover:bg-bg-elevated transition-colors", title: "Retry entire pipeline from Node 1", children: [_jsx(RotateCcw, { size: 12 }), " Retry (from Node 1)"] }), _jsxs("button", { onClick: () => {
                                    if (reviewReadyNode) {
                                        approveNode(reviewReadyNode.id);
                                    }
                                    else if (failedNode) {
                                        retryNode(failedNode.id);
                                    }
                                    else {
                                        resumePipeline();
                                    }
                                }, className: `flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${reviewReadyNode
                                    ? 'bg-accent-success/10 border border-accent-success/30 text-accent-success hover:bg-accent-success/20'
                                    : failedNode
                                        ? 'bg-accent-danger/10 border border-accent-danger/30 text-accent-danger hover:bg-accent-danger/20'
                                        : 'bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20'}`, title: reviewReadyNode ? 'Approve current node and continue' : failedNode ? 'Retry failed node' : 'Start/Continue pipeline', children: [_jsx(Play, { size: 12 }), " ", failedNode ? 'Retry Node' : 'Continue'] })] }), demoMode && (_jsx("div", { className: "bg-accent-secondary/20 border border-accent-secondary text-accent-secondary text-xs font-bold px-2 py-1 rounded animate-pulse", children: "DEMO MODE" }))] }), _jsxs("div", { className: "flex-1 flex flex-col min-h-0", children: [_jsxs("div", { className: "flex-1 relative min-h-0", children: [_jsx(PipelineCanvas, { concept: project.concept }), _jsx(HITLPanel, {}), _jsx(KanbanModal, {})] }), _jsx(ConsolePanel, {})] })] }));
}
