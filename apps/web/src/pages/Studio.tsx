import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
  Download,
} from "lucide-react";
import { api } from "../lib/api";
import { usePipelineStore } from "../store/pipeline.store";
import { NodeStatus } from "@forgeos/shared";
import { useSSE } from "../hooks/useSSE";
import { PipelineCanvas } from "../components/canvas/PipelineCanvas";
import { HITLPanel } from "../components/panels/HITLPanel";
import { ExportModal } from "../components/ExportModal";
import { KanbanModal } from "../components/modals/KanbanModal";
import { ConceptDetailModal } from "../components/modals/ConceptDetailModal";
import { ConsolePanel } from "../components/panels/ConsolePanel";
import type { Project, Deployment } from "@forgeos/shared";

export function Studio() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const setProjectId = usePipelineStore((s) => s.setProjectId);
  const initNodes = usePipelineStore((s) => s.initNodes);
  const handleSSEEvent = usePipelineStore((s) => s.handleSSEEvent);
  const demoMode = usePipelineStore((s) => s.demoMode);
  const sseConnected = usePipelineStore((s) => s.sseConnected);
  const nodes = usePipelineStore((s) => s.nodes);
  const deployment = usePipelineStore((s) => s.deployment);
  const startPipeline = usePipelineStore((s) => s.startPipeline);
  const approveNode = usePipelineStore((s) => s.approveNode);
  const retryNode = usePipelineStore((s) => s.retryNode);
  const resumePipeline = usePipelineStore((s) => s.resumePipeline);
  const openKanban = usePipelineStore((s) => s.openKanban);

  const hydratedOnce = useRef(false);

  const reviewReadyNode = nodes.find((n) => n.status === NodeStatus.REVIEW);
  const failedNode = nodes.find((n) => n.status === NodeStatus.FAILED);
  const techLeadNode = nodes[3];
  const shipyardNode = nodes[4];
  const hasKanbanData = techLeadNode?.status === NodeStatus.APPROVED; // Tech Lead is Node 3
  const hasActiveNodes = nodes.some(
    (n) => n.status === NodeStatus.QUEUED || n.status === NodeStatus.PROCESSING,
  );
  const isProjectComplete =
    shipyardNode?.status === NodeStatus.APPROVED ||
    !!(deployment?.stepADone && deployment?.stepBDone && deployment?.stepCDone && deployment?.stepDDone);
  const allAgentNodesApproved =
    nodes[1]?.status === NodeStatus.APPROVED &&
    nodes[2]?.status === NodeStatus.APPROVED &&
    nodes[3]?.status === NodeStatus.APPROVED;

  const [exportOpen, setExportOpen] = useState(false);

  // Poll DB when nodes are actively running so missed SSE events self-correct
  const {
    data: project,
    isLoading,
    error,
  } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId!),
    enabled: !!projectId,
    refetchInterval: hasActiveNodes ? 3000 : false,
  });

  const hasReachedShipyard =
    shipyardNode?.status !== NodeStatus.LOCKED ||
    (project?.currentNode ?? 0) >= 4;

  // Initialize project ID on mount — always wipe state before loading a new project
  useEffect(() => {
    if (projectId) {
      initNodes();
      hydratedOnce.current = false;
      setProjectId(projectId);
    }
    return () => {
      setProjectId("");
      initNodes();
      hydratedOnce.current = false;
    };
  }, [projectId, setProjectId, initNodes]);

  // Hydrate Zustand store from DB project data.
  // Builds the complete state atomically to avoid sequential read/write races.
  useEffect(() => {
    if (!project || project.id !== projectId) return;

    const outputs = project.agentOutputs;
    const currentNode = project.currentNode || 0;

    // --- Build nodes array ---
    const hydratedNodes = usePipelineStore.getState().nodes.map((n) => ({ ...n }));

    if (outputs) {
      // Pick best (latest version) output per node
      const bestByNode = new Map<number, any>();
      for (const output of outputs as any[]) {
        const prev = bestByNode.get(output.nodeId);
        if (!prev || output.version > prev.version) {
          bestByNode.set(output.nodeId, output);
        }
      }

      bestByNode.forEach((output) => {
        if (hydratedNodes[output.nodeId]) {
          hydratedNodes[output.nodeId].status = output.status;
          if (
            output.jsonPayload &&
            Object.keys(output.jsonPayload).length > 0
          ) {
            hydratedNodes[output.nodeId].payload = output.jsonPayload;
            hydratedNodes[output.nodeId].version = output.version;
          }
        }
      });

      // Enforce linear progression: all nodes before currentNode = APPROVED
      for (let i = 0; i < currentNode; i++) {
        if (hydratedNodes[i]) {
          hydratedNodes[i].status = NodeStatus.APPROVED;
        }
      }

    }

    // --- Build deployment state ---
    let hydratedDeployment: Partial<Deployment> | null = null;

    if (project.deployment) {
      const dep = project.deployment as any;
      hydratedDeployment = {
        githubRepoUrl: dep.githubRepoUrl || "",
        doAppUrl: dep.doAppUrl || "",
        zipReady: !!dep.zipPath,
        doAppId: dep.doAppId || undefined,
        stepADone: !!dep.stepADone,
        stepBDone: !!dep.stepBDone,
        stepCDone: !!dep.stepCDone,
        stepDDone: !!dep.stepDDone,
      };

      // If fully deployed, force all nodes to APPROVED
      if (dep.stepADone && dep.stepBDone && dep.stepCDone && dep.stepDDone) {
        for (let i = 0; i < 5; i++) {
          if (hydratedNodes[i]) {
            hydratedNodes[i].status = NodeStatus.APPROVED;
          }
        }
      }
    }

    // --- Single atomic store update ---
    usePipelineStore.setState({
      nodes: hydratedNodes,
      deployment: hydratedDeployment,
    });

    // --- Synthetic console logs — only on first load ---
    if (!hydratedOnce.current) {
      const now = new Date().toISOString();
      const nodeNames: Record<number, string> = {
        1: "Strategist",
        2: "Business Analyst",
        3: "Tech Lead",
        4: "Shipyard",
      };
      if (outputs) {
        const bestByNode = new Map<number, any>();
        for (const output of outputs as any[]) {
          const prev = bestByNode.get(output.nodeId);
          if (!prev || output.version > prev.version) {
            bestByNode.set(output.nodeId, output);
          }
        }
        bestByNode.forEach((output) => {
          handleSSEEvent({
            type: "LOG",
            nodeId: output.nodeId,
            level: output.status === "FAILED" ? "error" : "info",
            message: `[Restored] ${nodeNames[output.nodeId] ?? `Node ${output.nodeId}`}: ${output.status} (v${output.version})`,
            timestamp: now,
          });
        });
      }
      if (project.deployment) {
        const dep = project.deployment as any;
        const stepLabels: Record<string, string> = {
          A: "Clone & inject schema",
          B: "Push to GitHub",
          C: "Deploy to DigitalOcean",
          D: "Build active",
        };
        for (const [step, label] of Object.entries(stepLabels)) {
          if ((dep as any)[`step${step}Done`]) {
            handleSSEEvent({
              type: "LOG",
              nodeId: 4,
              level: "info",
              message: `[Restored] Step ${step}: ${label} — done`,
              timestamp: now,
            });
          }
        }
        handleSSEEvent({
          type: "LOG",
          nodeId: 4,
          level: dep.buildStatus === "ACTIVE" ? "info" : "warn",
          message: `[Restored] Shipyard build status: ${dep.buildStatus}`,
          timestamp: now,
        });
      }
      hydratedOnce.current = true;
    }
  }, [project, projectId, handleSSEEvent]);

  // Start SSE stream
  useSSE(projectId || null, handleSSEEvent);

  if (isLoading) {
    return (
      <div className="h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="animate-spin text-accent-primary w-8 h-8" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-screen bg-bg-base flex flex-col items-center justify-center text-text-primary gap-4">
        <p>Project not found or failed to load.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-bg-elevated border border-border px-4 py-2 rounded-md hover:bg-border transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-bg-base text-text-primary overflow-hidden">
      {/* SSE Disconnect Banner */}
      {!sseConnected && (
        <div className="bg-accent-danger/10 border-b border-accent-danger/30 px-4 py-1.5 flex items-center justify-center gap-2 shrink-0 z-30">
          <WifiOff size={14} className="text-accent-danger" />
          <span className="text-accent-danger text-xs font-semibold">
            Connection lost. Reconnecting...
          </span>
        </div>
      )}

      {/* Header Bar */}
      <header className="h-14 border-b border-border bg-bg-surface flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="h-4 w-[1px] bg-border" />
          <h1 className="text-sm font-mono truncate max-w-xl">
            {project.concept}
          </h1>
        </div>

        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => alert("Pause functionality coming soon!")}
            disabled={hasReachedShipyard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted bg-bg-base border border-border rounded-md transition-colors hover:text-text-primary hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-muted disabled:hover:bg-bg-base"
            title={
              hasReachedShipyard
                ? "Pause disabled after reaching Shipyard stage"
                : "Pause Pipeline"
            }
          >
            <Pause size={12} /> Pause
          </button>
          <button
            onClick={() => startPipeline()}
            disabled={hasReachedShipyard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted bg-bg-base border border-border rounded-md transition-colors hover:text-text-primary hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-muted disabled:hover:bg-bg-base"
            title={
              hasReachedShipyard
                ? "Disabled after reaching Shipyard stage"
                : "Retry entire pipeline from Node 1"
            }
          >
            <RotateCcw size={12} /> Retry (from Node 1)
          </button>
          <button
            onClick={() => {
              if (reviewReadyNode) {
                approveNode(reviewReadyNode.id);
              } else if (failedNode) {
                retryNode(failedNode.id);
              } else {
                resumePipeline();
              }
            }}
            disabled={isProjectComplete || (hasActiveNodes && !reviewReadyNode && !failedNode)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              reviewReadyNode
                ? "bg-accent-success/10 border border-accent-success/30 text-accent-success hover:bg-accent-success/20"
                : failedNode
                  ? "bg-accent-danger/10 border border-accent-danger/30 text-accent-danger hover:bg-accent-danger/20"
                  : "bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20"
            }`}
            title={
              isProjectComplete
                ? "Project is complete"
                : hasActiveNodes && !reviewReadyNode && !failedNode
                  ? "Pipeline is running…"
                  : reviewReadyNode
                    ? "Approve current node and continue"
                    : failedNode
                      ? "Retry failed node"
                      : "Start/Continue pipeline"
            }
          >
            <Play size={12} /> {failedNode ? "Retry Node" : "Continue"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {allAgentNodesApproved && (
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-accent-primary text-accent-primary bg-accent-primary/5 rounded-md hover:bg-accent-primary/15 transition-colors"
            >
              <Download size={12} /> Export Handoff
            </button>
          )}
          {demoMode && (
            <div className="bg-accent-secondary/20 border border-accent-secondary text-accent-secondary text-xs font-bold px-2 py-1 rounded animate-pulse">
              DEMO MODE
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 relative min-h-0">
          <PipelineCanvas concept={project.concept} />
          <HITLPanel />
          {projectId && (
            <ExportModal
              projectId={projectId}
              isOpen={exportOpen}
              onClose={() => setExportOpen(false)}
            />
          )}
          <KanbanModal />
          <ConceptDetailModal concept={project.concept} />
        </div>
        <ConsolePanel />
      </div>
    </div>
  );
}
