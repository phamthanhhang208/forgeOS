import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { usePipelineStore } from '../../store/pipeline.store';
import { NODE_LABELS } from '@forgeos/shared';
export function ConsolePanel() {
    const consoleLogs = usePipelineStore((s) => s.consoleLogs);
    const consoleOpen = usePipelineStore((s) => s.consoleOpen);
    const toggleConsole = usePipelineStore((s) => s.toggleConsole);
    const clearConsole = usePipelineStore((s) => s.clearConsole);
    const scrollRef = useRef(null);
    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (scrollRef.current && consoleOpen) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [consoleLogs, consoleOpen]);
    const errorCount = consoleLogs.filter((l) => l.level === 'error').length;
    return (_jsxs("div", { className: "shrink-0 border-t border-border bg-bg-surface/95 backdrop-blur-md", children: [_jsxs("div", { className: "flex items-center justify-between px-3 py-1.5", children: [_jsxs("button", { onClick: toggleConsole, className: "flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors", children: [_jsx(Terminal, { size: 13 }), "Console", errorCount > 0 && (_jsx("span", { className: "bg-accent-danger/20 text-accent-danger px-1.5 py-0.5 rounded text-[10px] font-bold", children: errorCount })), consoleLogs.length > 0 && errorCount === 0 && (_jsx("span", { className: "bg-accent-primary/20 text-accent-primary px-1.5 py-0.5 rounded text-[10px] font-bold", children: consoleLogs.length })), consoleOpen ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronUp, { size: 12 })] }), consoleOpen && (_jsx("button", { onClick: clearConsole, className: "text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-elevated", title: "Clear console", children: _jsx(Trash2, { size: 12 }) }))] }), consoleOpen && (_jsx("div", { className: "bg-[#0d1117]/95 border-t border-border/50 flex flex-col", style: { height: '220px' }, children: _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-relaxed", children: consoleLogs.length === 0 ? (_jsx("p", { className: "text-text-muted/50 italic", children: "Pipeline events will appear here..." })) : (consoleLogs.map((entry) => {
                        const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        });
                        const nodeName = NODE_LABELS[entry.nodeId] ?? `Node ${entry.nodeId}`;
                        const levelColor = entry.level === 'error'
                            ? 'text-accent-danger'
                            : entry.level === 'warn'
                                ? 'text-accent-warning'
                                : 'text-text-muted';
                        const messageColor = entry.level === 'error'
                            ? 'text-accent-danger/90'
                            : 'text-text-primary/80';
                        return (_jsxs("div", { className: "flex gap-2 py-0.5 hover:bg-white/[0.02] rounded", children: [_jsx("span", { className: "text-text-muted/50 shrink-0", children: time }), _jsxs("span", { className: `${levelColor} shrink-0 w-[140px] truncate`, children: ["[", nodeName, "]"] }), _jsx("span", { className: messageColor, children: entry.message })] }, entry.id));
                    })) }) }))] }));
}
