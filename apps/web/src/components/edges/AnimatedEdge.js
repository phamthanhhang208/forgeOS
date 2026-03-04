import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BaseEdge, getBezierPath } from '@xyflow/react';
export function AnimatedEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data, }) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    const isAnimating = data?.isAnimating;
    return (_jsxs(_Fragment, { children: [_jsx(BaseEdge, { path: edgePath, markerEnd: markerEnd, style: { ...style, strokeWidth: 2, stroke: 'var(--border)' } }), isAnimating && (_jsxs(_Fragment, { children: [_jsx("path", { d: edgePath, fill: "none", stroke: "var(--accent-primary)", strokeWidth: 3, strokeDasharray: "4 8", strokeLinecap: "round", opacity: 0.3, className: "animate-flow-dots", style: { filter: 'blur(3px)' } }), _jsx("path", { d: edgePath, fill: "none", stroke: "var(--accent-primary)", strokeWidth: 2, strokeDasharray: "4 8", strokeLinecap: "round", className: "animate-flow-dots", style: { filter: 'drop-shadow(0 0 4px var(--accent-primary))' } })] }))] }));
}
