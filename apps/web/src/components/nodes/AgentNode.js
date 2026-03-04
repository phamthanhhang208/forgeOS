import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Position } from '@xyflow/react';
import { NodeStatus } from '@forgeos/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Lock, Clock, RefreshCw, XCircle, FileSearch, Play, RotateCcw, } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { usePipelineStore } from '../../store/pipeline.store';
export const AgentNode = memo(({ data }) => {
    const openPanel = usePipelineStore((s) => s.openPanel);
    const approveNode = usePipelineStore((s) => s.approveNode);
    const retryNode = usePipelineStore((s) => s.retryNode);
    const { status, label, version } = data;
    const isLocked = status === NodeStatus.LOCKED;
    const isQueued = status === NodeStatus.QUEUED;
    const isProcessing = status === NodeStatus.PROCESSING;
    const isReview = status === NodeStatus.REVIEW;
    const isApproved = status === NodeStatus.APPROVED;
    const isFailed = status === NodeStatus.FAILED;
    const isRegenerating = status === NodeStatus.REGENERATING;
    const getBorderClass = () => {
        if (isReview)
            return 'border-accent-primary border-[1.5px] animate-glow';
        if (isApproved)
            return 'border-accent-success/50';
        if (isFailed)
            return 'border-accent-danger/50';
        if (isProcessing)
            return 'border-accent-primary/50';
        if (isRegenerating || isQueued)
            return 'border-accent-warning/50';
        return 'border-border/50';
    };
    const getGlowClass = () => {
        if (isProcessing)
            return 'bg-accent-primary/30 blur-md opacity-50';
        if (isRegenerating)
            return 'bg-accent-warning/30 blur-md opacity-50';
        return '';
    };
    const handleRetry = (e) => {
        e.stopPropagation();
        retryNode(data.id);
    };
    const handleProceed = (e) => {
        e.stopPropagation();
        approveNode(data.id);
    };
    const nodeContent = (_jsxs(BaseNode, { label: label, sourceHandle: Position.Right, targetHandle: Position.Left, className: `${getBorderClass()} ${isLocked ? 'opacity-40 grayscale' : ''}`, glowClass: getGlowClass(), children: [_jsxs("div", { className: "flex flex-col mt-2 gap-2 pb-2", children: [_jsxs("div", { className: "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", children: [isLocked && (_jsxs("span", { className: "text-text-muted flex items-center gap-1", children: [_jsx(Lock, { size: 12 }), " Locked"] })), isQueued && (_jsxs("span", { className: "text-accent-warning animate-pulse flex items-center gap-1", children: [_jsx(Clock, { size: 12 }), " Queued"] })), isProcessing && (_jsxs("span", { className: "text-accent-primary flex items-center gap-1", children: [_jsx(RefreshCw, { size: 12, className: "animate-spin" }), " Processing"] })), isReview && (_jsxs("span", { className: "text-accent-primary animate-pulse flex items-center gap-1", children: [_jsx(FileSearch, { size: 12 }), " Review Ready"] })), isApproved && (_jsxs("span", { className: "text-accent-success flex items-center gap-1", children: [_jsx(CheckCircle2, { size: 12 }), " Approved"] })), isFailed && (_jsxs("span", { className: "text-accent-danger flex items-center gap-1", children: [_jsx(XCircle, { size: 12 }), " Failed"] })), isRegenerating && (_jsxs("span", { className: "text-accent-warning flex items-center gap-1", children: [_jsx(RefreshCw, { size: 12, className: "animate-spin" }), " Regenerating"] }))] }), isFailed && (_jsxs("button", { onClick: handleRetry, className: "nodrag flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-accent-danger/10 border border-accent-danger/30 text-accent-danger rounded-md px-3 py-1.5 hover:bg-accent-danger/20 transition-colors mt-1", children: [_jsx(RotateCcw, { size: 11 }), " Retry"] })), isReview && (_jsxs("div", { className: "flex gap-1.5 mt-1", children: [_jsxs("button", { onClick: handleProceed, className: "nodrag flex-1 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-accent-success/10 border border-accent-success/30 text-accent-success rounded-md px-2 py-1.5 hover:bg-accent-success/20 transition-colors", children: [_jsx(Play, { size: 10 }), " Proceed"] }), _jsx("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    openPanel(data.id);
                                }, className: "nodrag flex items-center justify-center text-[11px] font-bold uppercase tracking-wider bg-bg-elevated border border-border text-text-muted rounded-md px-2 py-1.5 hover:text-text-primary hover:border-accent-primary/50 transition-colors", children: _jsx(FileSearch, { size: 10 }) })] })), isApproved && version && (_jsxs("div", { className: "text-[10px] text-text-muted mt-1 font-mono", children: ["v", version, " \u00B7 Click to view"] }))] }), isProcessing && (_jsx("div", { className: "absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl opacity-80", children: _jsx(motion.div, { className: "h-full bg-gradient-to-r from-transparent via-accent-primary to-transparent", initial: { x: '-100%' }, animate: { x: '100%' }, transition: { repeat: Infinity, duration: 1.5, ease: 'linear' } }) }))] }));
    return (_jsx("div", { onClick: () => {
            if (isApproved)
                openPanel(data.id);
        }, className: `transition-all duration-200 hover:-translate-y-1 ${isReview || isApproved || isFailed ? 'cursor-pointer' : 'cursor-default'}`, children: _jsx(AnimatePresence, { mode: "wait", children: isApproved ? (_jsx(motion.div, { initial: { scale: 0.9, opacity: 0.5 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring', stiffness: 300, damping: 20 }, children: nodeContent }, `approved-${data.id}`)) : (_jsx("div", { children: nodeContent }, `normal-${data.id}`)) }) }));
});
