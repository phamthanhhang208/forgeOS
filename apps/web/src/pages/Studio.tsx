import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  WifiOff,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { api } from "../lib/api";
import { usePipelineStore } from "../store/pipeline.store";
import { NodeStatus } from "@forgeos/shared";
import { useSSE } from "../hooks/useSSE";
import { PipelineCanvas } from "../components/canvas/PipelineCanvas";
import { HITLPanel } from "../components/panels/HITLPanel";
import { KanbanModal } from "../components/modals/KanbanModal";
import { ConceptDetailModal } from "../components/modals/ConceptDetailModal";
import { ConsolePanel } from "../components/panels/ConsolePanel";
import { Project } from "@forgeos/shared";

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
      console.log('[Studio] init projectId=', projectId);
      initNodes();
      hydratedOnce.current = false;
      setProjectId(projectId);
    }
    return () => {
      console.log('[Studio] cleanup projectId=', projectId);
      setProjectId("");
      initNodes();
      hydratedOnce.current = false;
    };
  }, [projectId, setProjectId, initNodes]);

  // Hydrate node states from DB fetch — only once per project load.
  // After initial hydration, SSE handles all live updates.
  useEffect(() => {
    console.log('[Studio] hydrate effect, hydratedOnce=', hydratedOnce.current, 'project?.id=', project?.id, 'projectId=', projectId);
    if (hydratedOnce.current) return;
    if (project && project.id === projectId) {
      const outputs = project.agentOutputs;

      if (outputs) {
        // Hydrate best status per node (latest version wins)
        const bestByNode = new Map<number, any>();
        for (const output of outputs as any[]) {
          const prev = bestByNode.get(output.nodeId);
          if (!prev || output.version > prev.version) {
            bestByNode.set(output.nodeId, output);
          }
        }

        console.log('[Studio] bestByNode:', Array.from(bestByNode.entries()).map(([k, v]) => `node${k}=${v.status}(v${v.version})`).join(', '));

        bestByNode.forEach((output) => {
          handleSSEEvent({
            type: "NODE_STATUS",
            nodeId: output.nodeId,
            status: output.status,
          });
          if (
            output.jsonPayload &&
            Object.keys(output.jsonPayload).length > 0
          ) {
            handleSSEEvent({
              type: "NODE_PAYLOAD",
              nodeId: output.nodeId,
              version: output.version,
              payload: output.jsonPayload as Record<string, unknown>,
            });
          }
        });

        // Enforce Linear Progression UI Rule:
        const currentNode = project.currentNode || 0;
        console.log('[Studio] currentNode=', currentNode, 'forcing nodes 0..', currentNode - 1, 'to APPROVED');
        for (let i = 0; i < currentNode; i++) {
          handleSSEEvent({
            type: "NODE_STATUS",
            nodeId: i,
            status: NodeStatus.APPROVED,
          });
        }

        // Synthetic console logs from DB state
        const now = new Date().toISOString();
        const nodeNames: Record<number, string> = {
          1: "Strategist",
          2: "Business Analyst",
          3: "Tech Lead",
          4: "Shipyard",
        };
        bestByNode.forEach((output) => {
          handleSSEEvent({
            type: "LOG",
            nodeId: output.nodeId,
            level: output.status === "FAILED" ? "error" : "info",
            message: `[Restored] ${nodeNames[output.nodeId] ?? `Node ${output.nodeId}`}: ${output.status} (v${output.version})`,
            timestamp: now,
          });
        });

        hydratedOnce.current = true;
      }

      if (project.deployment) {
        console.log('[Studio] deployment hydration, steps:', project.deployment);
        const dep = project.deployment as any;
        handleSSEEvent({
          type: "DEPLOYMENT_COMPLETE",
          githubUrl: dep.githubRepoUrl || "",
          doAppUrl: dep.doAppUrl || "",
          zipReady: !!dep.zipPath,
          doAppId: dep.doAppId || undefined,
        });

        // Hydrate individual shipyard steps from deployment flags
        const stepFlags = [
          {
            step: "A" as const,
            done: dep.stepADone,
            label: "Clone & inject schema",
          },
          { step: "B" as const, done: dep.stepBDone, label: "Push to GitHub" },
          {
            step: "C" as const,
            done: dep.stepCDone,
            label: "Deploy to DigitalOcean",
          },
          { step: "D" as const, done: dep.stepDDone, label: "Build active" },
        ];
        const now = new Date().toISOString();
        for (const sf of stepFlags) {
          if (sf.done) {
            handleSSEEvent({
              type: "SHIPYARD_STEP",
              step: sf.step,
              status: "DONE",
            });
            handleSSEEvent({
              type: "LOG",
              nodeId: 4,
              level: "info",
              message: `[Restored] Step ${sf.step}: ${sf.label} — done`,
              timestamp: now,
            });
          }
        }
        // Log current build status
        handleSSEEvent({
          type: "LOG",
          nodeId: 4,
          level: dep.buildStatus === "ACTIVE" ? "info" : "warn",
          message: `[Restored] Shipyard build status: ${dep.buildStatus}`,
          timestamp: now,
        });

        // If fully deployed, force all nodes to APPROVED so stale FAILED state
        // from a previously-viewed project never bleeds through.
        if (dep.stepADone && dep.stepBDone && dep.stepCDone && dep.stepDDone) {
          console.log('[Studio] fully deployed → forcing all nodes APPROVED');
          for (let i = 0; i < 5; i++) {
            handleSSEEvent({ type: "NODE_STATUS", nodeId: i, status: NodeStatus.APPROVED });
          }
        }
      }
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
          {hasKanbanData && (
            <button
              onClick={openKanban}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary bg-bg-base border border-border rounded-md hover:bg-bg-elevated transition-colors"
              title="Open Kanban Board"
            >
              📋 Kanban Board
            </button>
          )}
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

        {demoMode && (
          <div className="bg-accent-secondary/20 border border-accent-secondary text-accent-secondary text-xs font-bold px-2 py-1 rounded animate-pulse">
            DEMO MODE
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 relative min-h-0">
          <PipelineCanvas concept={project.concept} />
          <HITLPanel />
          <KanbanModal />
          <ConceptDetailModal concept={project.concept} />
        </div>
        <ConsolePanel />
      </div>
    </div>
  );
}
