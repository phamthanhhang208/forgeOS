// pipeline canvas component
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    EdgeTypes,
    NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePipelineStore } from '../../store/pipeline.store'
import { InputNode } from '../nodes/InputNode'
import { AgentNode } from '../nodes/AgentNode'
import { ShipyardNode } from '../nodes/ShipyardNode'
import { AnimatedEdge } from '../edges/AnimatedEdge'

const nodeTypes: NodeTypes = {
    inputNode: InputNode,
    agentNode: AgentNode,
    shipyardNode: ShipyardNode,
}

const edgeTypes: EdgeTypes = {
    animated: AnimatedEdge,
}

export function PipelineCanvas({ concept }: { concept: string }) {
    const nodes = usePipelineStore((s) => s.nodes)

    // Layout positions
    const rfNodes = [
        {
            id: 'node-0',
            type: 'inputNode',
            position: { x: 50, y: 200 },
            data: { concept },
            draggable: false,
        },
        {
            id: 'node-1',
            type: 'agentNode',
            position: { x: 350, y: 200 },
            data: nodes[1],
            draggable: false,
        },
        {
            id: 'node-2',
            type: 'agentNode',
            position: { x: 650, y: 200 },
            data: nodes[2],
            draggable: false,
        },
        {
            id: 'node-3',
            type: 'agentNode',
            position: { x: 950, y: 200 },
            data: nodes[3],
            draggable: false,
        },
        {
            id: 'node-4',
            type: 'shipyardNode',
            position: { x: 1250, y: 200 },
            data: nodes[4],
            draggable: false,
        },
    ]

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
    ]

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={rfNodes as any}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.5}
                className="canvas-bg"
            >
                <Background gap={28} size={1} color="var(--border)" />
                <Controls showInteractive={false} />
                <MiniMap
                    nodeStrokeWidth={3}
                    zoomable
                    pannable
                    nodeColor={(n) => {
                        if (n.type === 'inputNode') return '#2a2a3d'
                        const status = (n.data as any).status
                        if (status === 'PROCESSING') return '#00d4ff'
                        if (status === 'APPROVED') return '#10b981'
                        if (status === 'REVIEW') return '#7c3aed'
                        if (status === 'FAILED') return '#ef4444'
                        return '#1a1a28'
                    }}
                    maskColor="rgba(10, 10, 15, 0.7)"
                />
            </ReactFlow>
        </div>
    )
}
