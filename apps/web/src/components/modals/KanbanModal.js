import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ChevronRight, ChevronLeft, Kanban } from 'lucide-react';
import { usePipelineStore } from '../../store/pipeline.store';
const COLUMNS = [
    { id: 'backlog', title: 'Backlog', color: 'border-border', bg: 'bg-bg-base/30' },
    { id: 'todo', title: 'To Do', color: 'border-accent-primary/20', bg: 'bg-accent-primary/5' },
    { id: 'in-progress', title: 'In Progress', color: 'border-accent-warning/20', bg: 'bg-accent-warning/5' },
    { id: 'review', title: 'Review', color: 'border-accent-secondary/20', bg: 'bg-accent-secondary/5' },
    { id: 'done', title: 'Done', color: 'border-accent-success/20', bg: 'bg-accent-success/5' },
];
export function KanbanModal() {
    const kanbanOpen = usePipelineStore((s) => s.kanbanOpen);
    const closeKanban = usePipelineStore((s) => s.closeKanban);
    const nodes = usePipelineStore((s) => s.nodes);
    const [tickets, setTickets] = useState([]);
    // Parse payload when opened
    useEffect(() => {
        if (kanbanOpen) {
            const techLeadNode = nodes[3]; // Tech Lead is Node 3
            if (!techLeadNode?.payload)
                return;
            const payload = techLeadNode.payload;
            const phase1 = Array.isArray(payload.phase1Features) ? payload.phase1Features : [];
            const phase2 = Array.isArray(payload.phase2Features) ? payload.phase2Features : [];
            const allTickets = [
                ...phase1.map((item, idx) => ({
                    id: `p1-${idx}`,
                    feature: item.feature,
                    estimatedDays: item.estimatedDays,
                    phase: 1,
                    columnId: 'todo' // Phase 1 starts in To Do
                })),
                ...phase2.map((item, idx) => ({
                    id: `p2-${idx}`,
                    feature: item.feature,
                    estimatedDays: item.estimatedDays,
                    phase: 2,
                    columnId: 'backlog' // Phase 2 starts in Backlog (post-launch)
                }))
            ];
            setTickets(allTickets);
        }
    }, [kanbanOpen, nodes]);
    if (!kanbanOpen)
        return null;
    const moveTicket = (ticketId, direction) => {
        setTickets(current => current.map(ticket => {
            if (ticket.id === ticketId) {
                const currentIndex = COLUMNS.findIndex(c => c.id === ticket.columnId);
                const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
                if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
                    return { ...ticket, columnId: COLUMNS[nextIndex].id };
                }
            }
            return ticket;
        }));
    };
    return (_jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6", onClick: closeKanban, children: _jsxs(motion.div, { initial: { scale: 0.95, opacity: 0, y: 10 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.95, opacity: 0, y: 10 }, onClick: (e) => e.stopPropagation(), className: "w-full max-w-7xl h-[85vh] bg-bg-surface border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border bg-bg-elevated/50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary", children: _jsx(Kanban, { size: 18 }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-bold font-mono tracking-tight text-text-primary", children: "Project Sprint Board" }), _jsx("p", { className: "text-sm font-mono text-text-muted", children: "Generated from Tech Lead Architecture" })] })] }), _jsx("button", { onClick: closeKanban, className: "p-2 text-text-muted hover:text-text-primary rounded-full transition-colors", children: _jsx(X, { size: 20 }) })] }), _jsx("div", { className: "flex-1 overflow-x-auto p-6 bg-[#1a1b1e]", children: _jsx("div", { className: "flex gap-6 h-full min-w-max pb-4", children: COLUMNS.map((col, colIdx) => (_jsxs("div", { className: `w-[320px] rounded-lg border ${col.color} ${col.bg} flex flex-col`, children: [_jsxs("div", { className: `p-3 font-mono text-sm font-bold border-b ${col.color} flex items-center justify-between opacity-80`, children: [_jsx("span", { className: "uppercase tracking-widest", children: col.title }), _jsx("span", { className: "bg-bg-elevated/50 px-2 py-0.5 rounded text-text-muted text-xs", children: tickets.filter(t => t.columnId === col.id).length })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-3 flex flex-col gap-3", children: tickets.filter(t => t.columnId === col.id).map((ticket) => (_jsxs("div", { className: "bg-bg-surface border border-border/80 rounded-md p-3 shadow-sm hover:border-border transition-colors group relative", children: [_jsxs("div", { className: "flex items-start justify-between gap-2 mb-2", children: [_jsxs("span", { className: `text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${ticket.phase === 1 ? 'bg-accent-primary/15 text-accent-primary' : 'bg-border/60 text-text-muted'}`, children: ["PHASE ", ticket.phase] }), _jsxs("div", { className: "flex items-center gap-1 text-[11px] text-text-muted font-mono bg-bg-base/60 px-1.5 py-0.5 rounded border border-border/40", children: [_jsx(Clock, { size: 10 }), ticket.estimatedDays, "d"] })] }), _jsx("p", { className: "text-[13px] text-text-primary/90 leading-snug pr-8", children: ticket.feature }), _jsxs("div", { className: "absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [colIdx > 0 && (_jsx("button", { onClick: () => moveTicket(ticket.id, 'left'), className: "p-1.5 bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-border rounded border border-border/50", children: _jsx(ChevronLeft, { size: 12 }) })), colIdx < COLUMNS.length - 1 && (_jsx("button", { onClick: () => moveTicket(ticket.id, 'right'), className: "p-1.5 bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-border rounded border border-border/50", children: _jsx(ChevronRight, { size: 12 }) }))] })] }, ticket.id))) })] }, col.id))) }) })] }, "modal") }, "backdrop") }));
}
