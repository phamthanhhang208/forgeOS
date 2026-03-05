import { useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
    ReactFlow,
    Background,
    Controls,
    Handle,
    Position,
    MarkerType,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
} from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid, Network, Maximize2, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntityField { name: string; type: string }
interface Entity { name: string; fields: EntityField[]; relations?: string[] }

// ─── Table card ───────────────────────────────────────────────────────────────

export const DataEntityCard = ({ item }: { item: Entity }) => (
    <div className="bg-bg-elevated rounded-lg border border-border/40 overflow-hidden">
        <div className="px-3 py-2 bg-bg-base/60 border-b border-border/40 flex items-center gap-2">
            <span className="font-bold text-text-primary text-[13px] font-mono">{item.name}</span>
            {item.fields?.length > 0 && (
                <span className="text-[10px] text-text-muted font-mono ml-auto">{item.fields.length} fields</span>
            )}
        </div>
        {item.fields?.length > 0 && (
            <div className="px-3 py-2">
                <table className="w-full">
                    <tbody>
                        {item.fields.map((f, i) => (
                            <tr key={i} className="border-b border-border/20 last:border-0">
                                <td className="py-1 pr-3 font-mono text-[12px] text-text-primary/90">{f.name}</td>
                                <td className="py-1">
                                    <span className="text-[11px] font-mono bg-accent-primary/10 text-accent-primary border border-accent-primary/20 px-1.5 py-0.5 rounded">
                                        {f.type}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {item.relations && item.relations.length > 0 && (
            <div className="px-3 pb-2 border-t border-border/20 pt-1.5 flex flex-col gap-0.5">
                {item.relations.map((r, i) => (
                    <p key={i} className="text-[11px] text-text-muted flex gap-1.5 items-start">
                        <span className="text-accent-secondary/60 shrink-0">↔</span>{r}
                    </p>
                ))}
            </div>
        )}
    </div>
)

// ─── ReactFlow custom node ─────────────────────────────────────────────────────

function EntityNode({ data }: { data: any }) {
    const entity = data as Entity
    return (
        <>
            <Handle
                type="target"
                position={Position.Left}
                style={{ background: '#7c3aed', border: '2px solid #1a1a28', width: 10, height: 10 }}
            />
            <div
                style={{
                    background: '#12121a',
                    border: '1px solid #2a2a3d',
                    borderRadius: 8,
                    overflow: 'hidden',
                    minWidth: 180,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                }}
            >
                <div style={{
                    background: 'rgba(10,10,15,0.7)',
                    borderBottom: '1px solid #2a2a3d',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 12, color: '#ffffff' }}>
                        {entity.name}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9ca3af' }}>
                        {entity.fields?.length ?? 0}f
                    </span>
                </div>
                {entity.fields?.length > 0 && (
                    <div style={{ padding: '6px 12px 8px' }}>
                        {entity.fields.map((f, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 16,
                                    padding: '3px 0',
                                    borderBottom: i < entity.fields.length - 1 ? '1px solid rgba(42,42,61,0.4)' : 'none',
                                }}
                            >
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>
                                    {f.name}
                                </span>
                                <span style={{
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: 10,
                                    color: '#00d4ff',
                                    background: 'rgba(0,212,255,0.08)',
                                    border: '1px solid rgba(0,212,255,0.2)',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                }}>
                                    {f.type}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <Handle
                type="source"
                position={Position.Right}
                style={{ background: '#7c3aed', border: '2px solid #1a1a28', width: 10, height: 10 }}
            />
        </>
    )
}

const nodeTypes = { entityNode: EntityNode }

// ─── Graph builder ─────────────────────────────────────────────────────────────

function buildGraph(entities: Entity[]): { nodes: Node[]; edges: Edge[] } {
    const COLS = 2
    const COL_W = 210
    const COL_GAP = 110
    const ROW_GAP = 60

    const rowMaxFields: number[] = []
    for (let i = 0; i < entities.length; i++) {
        const row = Math.floor(i / COLS)
        rowMaxFields[row] = Math.max(rowMaxFields[row] ?? 0, entities[i].fields?.length ?? 0)
    }

    const rowY: number[] = [0]
    for (let r = 0; r < rowMaxFields.length - 1; r++) {
        const nodeH = 40 + rowMaxFields[r] * 24 + 16
        rowY.push(rowY[r] + nodeH + ROW_GAP)
    }

    const nodes: Node[] = entities.map((entity, i) => ({
        id: entity.name,
        type: 'entityNode',
        position: {
            x: (i % COLS) * (COL_W + COL_GAP),
            y: rowY[Math.floor(i / COLS)],
        },
        data: entity as any,
    }))

    const entityNames = entities.map(e => e.name)
    const edgeSet = new Set<string>()
    const edges: Edge[] = []

    for (const entity of entities) {
        for (const relation of entity.relations ?? []) {
            for (const targetName of entityNames) {
                if (targetName === entity.name) continue
                if (!relation.toLowerCase().includes(targetName.toLowerCase())) continue

                const edgeKey = [entity.name, targetName].sort().join('↔')
                if (edgeSet.has(edgeKey)) continue
                edgeSet.add(edgeKey)

                const isHasMany = /has many/i.test(relation)
                const isBelongsTo = /belongs to/i.test(relation)
                const label = isHasMany ? '1 : N' : isBelongsTo ? 'N : 1' : undefined

                edges.push({
                    id: `${entity.name}→${targetName}`,
                    source: entity.name,
                    target: targetName,
                    type: 'smoothstep',
                    label,
                    labelStyle: { fill: '#9ca3af', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
                    labelBgStyle: { fill: '#1a1a28', fillOpacity: 0.95 },
                    labelBgPadding: [4, 3],
                    labelBgBorderRadius: 3,
                    style: { stroke: '#7c3aed', strokeWidth: 1.5 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed', width: 14, height: 14 },
                })
            }
        }
    }

    return { nodes, edges }
}

// ─── Shared flow props ─────────────────────────────────────────────────────────

interface FlowProps { entities: Entity[]; interactive?: boolean }

function ERFlow({ entities, interactive = false }: FlowProps) {
    const initialGraph = useMemo(() => buildGraph(entities), [entities])
    const [nodes, , onNodesChange] = useNodesState(initialGraph.nodes)
    const [edges] = useEdgesState(initialGraph.edges)
    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={interactive}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={interactive}
            zoomOnScroll={interactive}
            zoomOnPinch={interactive}
            zoomOnDoubleClick={false}
        >
            <Background color="#2a2a3d" gap={24} size={1} />
            {interactive && (
                <Controls
                    showInteractive={false}
                    style={{ background: '#1a1a28', border: '1px solid #2a2a3d', borderRadius: 8 }}
                />
            )}
        </ReactFlow>
    )
}

// ─── Fullscreen modal ─────────────────────────────────────────────────────────

function FullscreenDiagram({ entities, onClose }: { entities: Entity[]; onClose: () => void }) {
    const handleKey = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="fs-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col"
                onKeyDown={handleKey}
                tabIndex={-1}
            >
                {/* Header bar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-bg-surface/90 shrink-0">
                    <div className="flex items-center gap-3">
                        <Network size={16} className="text-accent-secondary" />
                        <span className="font-mono font-bold text-sm text-text-primary">ER Diagram</span>
                        <span className="text-[11px] font-mono text-text-muted bg-bg-elevated border border-border/60 px-2 py-0.5 rounded-full">
                            {entities.length} models
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Diagram */}
                <motion.div
                    className="flex-1"
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.05 }}
                >
                    <ERFlow entities={entities} interactive />
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    )
}

// ─── Inline diagram ────────────────────────────────────────────────────────────

function DataEntityDiagram({ entities, onFullscreen }: { entities: Entity[]; onFullscreen: () => void }) {
    const rows = Math.ceil(entities.length / 2)
    const height = Math.min(Math.max(280, rows * 220), 520)

    return (
        <div className="relative mt-1 group">
            <div style={{ height }} className="rounded-lg border border-border/50 overflow-hidden">
                <ERFlow entities={entities} interactive />
            </div>
            {/* Fullscreen button — appears on hover */}
            <button
                onClick={onFullscreen}
                title="View fullscreen"
                className="absolute top-2 right-2 p-1.5 bg-bg-elevated/90 border border-border/60 rounded-md text-text-muted hover:text-text-primary hover:border-accent-primary/40 transition-all opacity-0 group-hover:opacity-100"
            >
                <Maximize2 size={13} />
            </button>
        </div>
    )
}

// ─── Section with toggle ───────────────────────────────────────────────────────

export function DataEntitiesSection({ entities }: { entities: any[] }) {
    const [mode, setMode] = useState<'table' | 'diagram'>('table')
    const [fullscreen, setFullscreen] = useState(false)

    return (
        <div className="flex flex-col gap-2 mt-1">
            {/* Mode toggle */}
            <div className="flex justify-end">
                <div className="flex bg-bg-surface rounded-md p-0.5 border border-border/50">
                    <button
                        onClick={() => setMode('table')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] transition-colors font-mono ${mode === 'table'
                            ? 'bg-border text-text-primary shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                            }`}
                    >
                        <LayoutGrid size={11} /> Table
                    </button>
                    <button
                        onClick={() => setMode('diagram')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] transition-colors font-mono ${mode === 'diagram'
                            ? 'bg-border text-text-primary shadow-sm'
                            : 'text-text-muted hover:text-text-primary'
                            }`}
                    >
                        <Network size={11} /> Diagram
                    </button>
                </div>
            </div>

            {mode === 'table' ? (
                entities.map((item, i) => <DataEntityCard key={i} item={item} />)
            ) : (
                <DataEntityDiagram entities={entities} onFullscreen={() => setFullscreen(true)} />
            )}

            {fullscreen && (
                <FullscreenDiagram entities={entities} onClose={() => setFullscreen(false)} />
            )}
        </div>
    )
}
