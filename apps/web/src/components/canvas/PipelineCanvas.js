import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// pipeline canvas component
import { ReactFlow, Background, Controls, MiniMap, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePipelineStore } from '../../store/pipeline.store';
import { InputNode } from '../nodes/InputNode';
import { AgentNode } from '../nodes/AgentNode';
import { ShipyardNode } from '../nodes/ShipyardNode';
import { AnimatedEdge } from '../edges/AnimatedEdge';
const nodeTypes = {
    inputNode: InputNode,
    agentNode: AgentNode,
    shipyardNode: ShipyardNode,
};
const edgeTypes = {
    animated: AnimatedEdge,
};
export function PipelineCanvas({ concept }) {
    const nodes = usePipelineStore((s) => s.nodes);
    // Layout positions — ~260px gap keeps all 5 nodes visible in most viewports
    // Explicit width/height ensures MiniMap can render node rectangles
    const rfNodes = [
        {
            id: 'node-0',
            type: 'inputNode',
            position: { x: 0, y: 150 },
            data: { concept },
            draggable: false,
            width: 220,
            height: 140,
        },
        {
            id: 'node-1',
            type: 'agentNode',
            position: { x: 260, y: 150 },
            data: nodes[1],
            draggable: false,
            width: 220,
            height: 140,
        },
        {
            id: 'node-2',
            type: 'agentNode',
            position: { x: 520, y: 150 },
            data: nodes[2],
            draggable: false,
            width: 220,
            height: 140,
        },
        {
            id: 'node-3',
            type: 'agentNode',
            position: { x: 780, y: 150 },
            data: nodes[3],
            draggable: false,
            width: 220,
            height: 140,
        },
        {
            id: 'node-4',
            type: 'shipyardNode',
            position: { x: 1040, y: 150 },
            data: nodes[4],
            draggable: false,
            width: 260,
            height: 140,
        },
    ];
    // Flow animated edges logic
    const rfEdges = [
        {
            id: 'e0-1',
            source: 'node-0',
            target: 'node-1',
            type: 'animated',
            data: { isAnimating: nodes[1].status === 'PROCESSING' },
        },
        {
            id: 'e1-2',
            source: 'node-1',
            target: 'node-2',
            type: 'animated',
            data: { isAnimating: nodes[2].status === 'PROCESSING' },
        },
        {
            id: 'e2-3',
            source: 'node-2',
            target: 'node-3',
            type: 'animated',
            data: { isAnimating: nodes[3].status === 'PROCESSING' },
        },
        {
            id: 'e3-4',
            source: 'node-3',
            target: 'node-4',
            type: 'animated',
            data: { isAnimating: nodes[4].status === 'PROCESSING' },
        },
    ];
    return (_jsxs("div", { className: "w-full h-full relative", children: [_jsxs(ReactFlow, { nodes: rfNodes, edges: rfEdges, nodeTypes: nodeTypes, edgeTypes: edgeTypes, nodesDraggable: false, fitView: true, fitViewOptions: { padding: 0.3, maxZoom: 1 }, minZoom: 0.3, maxZoom: 1.5, className: "canvas-bg", children: [_jsx(Background, { gap: 28, size: 1, color: "var(--border)" }), _jsx(Controls, { showInteractive: false }), _jsx(MiniMap, { nodeStrokeWidth: 2, zoomable: true, pannable: true, nodeColor: (n) => {
                            if (n.type === 'inputNode')
                                return '#3a3a5d';
                            const status = n.data.status;
                            if (status === 'PROCESSING')
                                return '#00d4ff';
                            if (status === 'APPROVED')
                                return '#10b981';
                            if (status === 'REVIEW')
                                return '#7c3aed';
                            if (status === 'FAILED')
                                return '#ef4444';
                            return '#2a2a4d';
                        }, nodeStrokeColor: "#4a4a6d", maskColor: "rgba(10, 10, 15, 0.6)", style: { zIndex: 20 } })] }), _jsx("div", { className: "vignette" })] }));
}
