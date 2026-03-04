import { memo, useState } from "react";
import { Position } from "@xyflow/react";
import { Play, Loader2, Maximize2 } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { usePipelineStore } from "../../store/pipeline.store";
import { NodeStatus } from "@forgeos/shared";

export const InputNode = memo(({ data }: { data: any }) => {
  const nodes = usePipelineStore((s) => s.nodes);
  const startPipeline = usePipelineStore((s) => s.startPipeline);
  const openConceptModal = usePipelineStore((s) => s.openConceptModal);
  const [starting, setStarting] = useState(false);

  const concept = data.concept || "";
  const isLong = concept.length > 150;

  // Show "Start" button if Node 1 is LOCKED or FAILED
  const node1 = nodes.find((n) => n.id === 1);
  const showStart =
    node1 &&
    (node1.status === NodeStatus.LOCKED || node1.status === NodeStatus.FAILED);
  const node1Processing =
    node1 &&
    (node1.status === NodeStatus.PROCESSING ||
      node1.status === NodeStatus.QUEUED);

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setStarting(true);
    try {
      await startPipeline();
    } finally {
      setStarting(false);
    }
  };

  return (
    <BaseNode
      label="💡 Concept Input"
      status="ACTIVE"
      sourceHandle={Position.Right}
      className="!w-[220px]"
    >
      <div className="text-sm border border-border bg-black/40 p-3 rounded-lg mt-2 text-text-muted leading-relaxed">
        <div
          className="overflow-hidden text-ellipsis"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {concept || "Enter a concept to start"}
        </div>

        {isLong && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openConceptModal();
            }}
            className="nodrag mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-accent-primary hover:text-accent-primary/80 transition-colors border-t border-border/50 pt-2"
          >
            <Maximize2 size={11} />
            <span>View Full Concept</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] text-accent-success uppercase font-bold tracking-wider">
          ✓ Online
        </div>

        {showStart && (
          <button
            onClick={handleStart}
            disabled={starting}
            className="nodrag flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-accent-primary/15 border border-accent-primary/40 text-accent-primary rounded-md px-3 py-1 hover:bg-accent-primary/25 transition-colors disabled:opacity-50"
          >
            {starting ? (
              <>
                <Loader2 size={11} className="animate-spin" /> Starting...
              </>
            ) : (
              <>
                <Play size={10} /> Start Pipeline
              </>
            )}
          </button>
        )}

        {node1Processing && (
          <span className="text-[10px] text-accent-primary uppercase font-bold tracking-wider animate-pulse">
            Running...
          </span>
        )}
      </div>
    </BaseNode>
  );
});
