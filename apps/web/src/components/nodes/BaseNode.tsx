import { Handle, Position } from "@xyflow/react";
import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface BaseNodeProps {
  label: string;
  status?: string;
  children?: ReactNode;
  sourceHandle?: Position;
  targetHandle?: Position;
  className?: string;
  glowClass?: string;
}

export function BaseNode({
  label,
  children,
  sourceHandle,
  targetHandle,
  className,
  glowClass,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "relative bg-bg-surface/90 border border-border rounded-xl min-w-[220px] min-h-[100px] shadow-lg flex flex-col",
        "backdrop-blur-xl",
        className,
      )}
    >
      {glowClass && (
        <div
          className={cn("absolute -inset-[1px] rounded-xl z-[-1]", glowClass)}
        />
      )}
      <div className="px-4 py-3 pb-1 flex-1">
        <h3 className="text-[13px] font-bold tracking-tight text-text-primary font-mono mb-1 leading-snug max-w-[180px]">
          {label}
        </h3>
        {children}
      </div>
      {targetHandle && (
        <Handle
          type="target"
          position={targetHandle}
          className="!w-2.5 !h-2.5 !bg-bg-elevated !border-[1.5px] !border-border"
        />
      )}
      {sourceHandle && (
        <Handle
          type="source"
          position={sourceHandle}
          className="!w-2.5 !h-2.5 !bg-accent-primary !border-[1.5px] !border-border"
        />
      )}
    </div>
  );
}
