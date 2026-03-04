import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Handle } from '@xyflow/react';
import { cn } from '../../lib/utils';
export function BaseNode({ label, children, sourceHandle, targetHandle, className, glowClass, }) {
    return (_jsxs("div", { className: cn('relative bg-bg-surface/90 border border-border rounded-xl w-[220px] min-h-[100px] shadow-lg flex flex-col', 'backdrop-blur-xl', className), children: [glowClass && (_jsx("div", { className: cn('absolute -inset-[1px] rounded-xl z-[-1]', glowClass) })), _jsxs("div", { className: "px-4 py-3 pb-1 flex-1", children: [_jsx("h3", { className: "text-[13px] font-bold tracking-tight text-text-primary font-mono mb-1 leading-snug max-w-[180px]", children: label }), children] }), targetHandle && (_jsx(Handle, { type: "target", position: targetHandle, className: "!w-2.5 !h-2.5 !bg-bg-elevated !border-[1.5px] !border-border" })), sourceHandle && (_jsx(Handle, { type: "source", position: sourceHandle, className: "!w-2.5 !h-2.5 !bg-accent-primary !border-[1.5px] !border-border" }))] }));
}
