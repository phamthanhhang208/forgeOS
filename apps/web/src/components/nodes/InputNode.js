import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useState } from 'react';
import { Position } from '@xyflow/react';
import { Play, Loader2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { usePipelineStore } from '../../store/pipeline.store';
import { NodeStatus } from '@forgeos/shared';
export const InputNode = memo(({ data }) => {
    const nodes = usePipelineStore((s) => s.nodes);
    const startPipeline = usePipelineStore((s) => s.startPipeline);
    const [starting, setStarting] = useState(false);
    // Show "Start" button if Node 1 is LOCKED or FAILED
    const node1 = nodes.find((n) => n.id === 1);
    const showStart = node1 && (node1.status === NodeStatus.LOCKED || node1.status === NodeStatus.FAILED);
    const node1Processing = node1 && (node1.status === NodeStatus.PROCESSING || node1.status === NodeStatus.QUEUED);
    const handleStart = async (e) => {
        e.stopPropagation();
        setStarting(true);
        try {
            await startPipeline();
        }
        finally {
            setStarting(false);
        }
    };
    return (_jsxs(BaseNode, { label: "\uD83D\uDCA1 Concept Input", status: "ACTIVE", sourceHandle: Position.Right, children: [_jsx("div", { className: "text-sm border border-border bg-black/40 p-3 rounded-lg mt-2 text-text-muted cursor-default overflow-hidden text-ellipsis line-clamp-3 leading-snug", children: data.concept || 'Enter a concept to start' }), _jsxs("div", { className: "flex items-center justify-between mt-2", children: [_jsx("div", { className: "text-[10px] text-accent-success uppercase font-bold tracking-wider", children: "\u2713 Active" }), showStart && (_jsx("button", { onClick: handleStart, disabled: starting, className: "nodrag flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-accent-primary/15 border border-accent-primary/40 text-accent-primary rounded-md px-3 py-1 hover:bg-accent-primary/25 transition-colors disabled:opacity-50", children: starting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 11, className: "animate-spin" }), " Starting..."] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 10 }), " Start Pipeline"] })) })), node1Processing && (_jsx("span", { className: "text-[10px] text-accent-primary uppercase font-bold tracking-wider animate-pulse", children: "Running..." }))] })] }));
});
