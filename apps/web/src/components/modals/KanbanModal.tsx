import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, ChevronRight, ChevronLeft, Kanban } from 'lucide-react'
import { usePipelineStore } from '../../store/pipeline.store'

type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done'

interface Ticket {
    id: string
    feature: string
    estimatedDays: number
    phase: 1 | 2
    columnId: ColumnId
}

const COLUMNS = [
    { id: 'backlog', title: 'Backlog', color: 'border-border', bg: 'bg-bg-base/30' },
    { id: 'todo', title: 'To Do', color: 'border-accent-primary/20', bg: 'bg-accent-primary/5' },
    { id: 'in-progress', title: 'In Progress', color: 'border-accent-warning/20', bg: 'bg-accent-warning/5' },
    { id: 'review', title: 'Review', color: 'border-accent-secondary/20', bg: 'bg-accent-secondary/5' },
    { id: 'done', title: 'Done', color: 'border-accent-success/20', bg: 'bg-accent-success/5' },
] as const

export function KanbanModal() {
    const kanbanOpen = usePipelineStore((s) => s.kanbanOpen)
    const closeKanban = usePipelineStore((s) => s.closeKanban)
    const nodes = usePipelineStore((s) => s.nodes)

    const [tickets, setTickets] = useState<Ticket[]>([])

    // Parse payload when opened
    useEffect(() => {
        if (kanbanOpen) {
            const techLeadNode = nodes[3] // Tech Lead is Node 3
            if (!techLeadNode?.payload) return

            const payload: any = techLeadNode.payload
            const phase1 = Array.isArray(payload.phase1Features) ? payload.phase1Features : []
            const phase2 = Array.isArray(payload.phase2Features) ? payload.phase2Features : []

            const allTickets: Ticket[] = [
                ...phase1.map((item: any, idx: number) => ({
                    id: `p1-${idx}`,
                    feature: item.feature,
                    estimatedDays: item.estimatedDays,
                    phase: 1 as const,
                    columnId: 'todo' as ColumnId // Phase 1 starts in To Do
                })),
                ...phase2.map((item: any, idx: number) => ({
                    id: `p2-${idx}`,
                    feature: item.feature,
                    estimatedDays: item.estimatedDays,
                    phase: 2 as const,
                    columnId: 'backlog' as ColumnId // Phase 2 starts in Backlog (post-launch)
                }))
            ]
            setTickets(allTickets)
        }
    }, [kanbanOpen, nodes])

    if (!kanbanOpen) return null

    const moveTicket = (ticketId: string, direction: 'left' | 'right') => {
        setTickets(current => current.map(ticket => {
            if (ticket.id === ticketId) {
                const currentIndex = COLUMNS.findIndex(c => c.id === ticket.columnId)
                const nextIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1
                if (nextIndex >= 0 && nextIndex < COLUMNS.length) {
                    return { ...ticket, columnId: COLUMNS[nextIndex].id }
                }
            }
            return ticket
        }))
    }

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
                onClick={closeKanban}
            >
                <motion.div
                    key="modal"
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-7xl h-[85vh] bg-bg-surface border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between p-4 border-b border-border bg-bg-elevated/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                                <Kanban size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold font-mono tracking-tight text-text-primary">Project Sprint Board</h2>
                                <p className="text-sm font-mono text-text-muted">Generated from Tech Lead Architecture</p>
                            </div>
                        </div>
                        <button onClick={closeKanban} className="p-2 text-text-muted hover:text-text-primary rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-x-auto p-6 bg-[#1a1b1e]">
                        <div className="flex gap-6 h-full min-w-max pb-4">
                            {COLUMNS.map((col, colIdx) => (
                                <div key={col.id} className={`w-[320px] rounded-lg border ${col.color} ${col.bg} flex flex-col`}>
                                    <div className={`p-3 font-mono text-sm font-bold border-b ${col.color} flex items-center justify-between opacity-80`}>
                                        <span className="uppercase tracking-widest">{col.title}</span>
                                        <span className="bg-bg-elevated/50 px-2 py-0.5 rounded text-text-muted text-xs">
                                            {tickets.filter(t => t.columnId === col.id).length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                                        {tickets.filter(t => t.columnId === col.id).map((ticket) => (
                                            <div key={ticket.id} className="bg-bg-surface border border-border/80 rounded-md p-3 shadow-sm hover:border-border transition-colors group relative">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${ticket.phase === 1 ? 'bg-accent-primary/15 text-accent-primary' : 'bg-border/60 text-text-muted'}`}>
                                                        PHASE {ticket.phase}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[11px] text-text-muted font-mono bg-bg-base/60 px-1.5 py-0.5 rounded border border-border/40">
                                                        <Clock size={10} />
                                                        {ticket.estimatedDays}d
                                                    </div>
                                                </div>
                                                <p className="text-[13px] text-text-primary/90 leading-snug pr-8">{ticket.feature}</p>

                                                {/* Card action buttons */}
                                                <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {colIdx > 0 && (
                                                        <button
                                                            onClick={() => moveTicket(ticket.id, 'left')}
                                                            className="p-1.5 bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-border rounded border border-border/50"
                                                        >
                                                            <ChevronLeft size={12} />
                                                        </button>
                                                    )}
                                                    {colIdx < COLUMNS.length - 1 && (
                                                        <button
                                                            onClick={() => moveTicket(ticket.id, 'right')}
                                                            className="p-1.5 bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-border rounded border border-border/50"
                                                        >
                                                            <ChevronRight size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
