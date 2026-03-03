import { memo } from 'react'
import { Position } from '@xyflow/react'
import { NodeStatus } from '@forgeos/shared'
import { motion } from 'framer-motion'
import {
    CheckCircle2,
    Lock,
    Clock,
    RefreshCw,
    XCircle,
    FileSearch,
} from 'lucide-react'
import { BaseNode } from './BaseNode'
import { usePipelineStore } from '../../store/pipeline.store'

interface AgentNodeData {
    id: number
    label: string
    status: NodeStatus
    version?: number
    timestamp?: string
}

export const AgentNode = memo(({ data }: { data: AgentNodeData }) => {
    const openPanel = usePipelineStore((s) => s.openPanel)
    const { status, label, version } = data

    const isLocked = status === NodeStatus.LOCKED
    const isQueued = status === NodeStatus.QUEUED
    const isProcessing = status === NodeStatus.PROCESSING
    const isReview = status === NodeStatus.REVIEW
    const isApproved = status === NodeStatus.APPROVED
    const isFailed = status === NodeStatus.FAILED
    const isRegenerating = status === NodeStatus.REGENERATING

    const getBorderClass = () => {
        if (isReview) return 'border-accent-primary border-[1.5px]'
        if (isApproved) return 'border-accent-success/50'
        if (isFailed) return 'border-accent-danger/50'
        if (isProcessing) return 'border-accent-primary/50'
        if (isRegenerating || isQueued) return 'border-accent-warning/50'
        return 'border-border/50'
    }

    const getGlowClass = () => {
        if (isProcessing) return 'bg-accent-primary/30 blur-md opacity-50'
        if (isRegenerating) return 'bg-accent-warning/30 blur-md opacity-50'
        return ''
    }

    return (
        <div
            onClick={() => {
                if (isReview || isApproved) openPanel(data.id)
            }}
            className={`transition-transform hover:-translate-y-1 ${isReview || isApproved ? 'cursor-pointer' : 'cursor-default'
                }`}
        >
            <BaseNode
                label={label}
                sourceHandle={Position.Right}
                targetHandle={Position.Left}
                className={`${getBorderClass()} ${isLocked ? 'opacity-50 grayscale' : ''}`}
                glowClass={getGlowClass()}
            >
                <div className="flex flex-col mt-2 gap-2 pb-2">
                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                        {isLocked && (
                            <span className="text-text-muted flex items-center gap-1">
                                <Lock size={12} /> Locked
                            </span>
                        )}
                        {isQueued && (
                            <span className="text-accent-warning animate-pulse flex items-center gap-1">
                                <Clock size={12} /> Queued
                            </span>
                        )}
                        {isProcessing && (
                            <span className="text-accent-primary flex items-center gap-1">
                                <RefreshCw size={12} className="animate-spin" /> Processing
                            </span>
                        )}
                        {isReview && (
                            <span className="text-accent-primary animate-pulse flex items-center gap-1">
                                <FileSearch size={12} /> Review Ready
                            </span>
                        )}
                        {isApproved && (
                            <span className="text-accent-success flex items-center gap-1">
                                <CheckCircle2 size={12} /> Approved
                            </span>
                        )}
                        {isFailed && (
                            <span className="text-accent-danger flex items-center gap-1">
                                <XCircle size={12} /> Failed
                            </span>
                        )}
                        {isRegenerating && (
                            <span className="text-accent-warning flex items-center gap-1">
                                <RefreshCw size={12} className="animate-spin" /> Regenerating
                            </span>
                        )}
                    </div>

                    {/* Version Info */}
                    {(isReview || isApproved) && version && (
                        <div className="text-[10px] text-text-muted mt-1 font-mono">
                            v{version} · Click to view
                        </div>
                    )}
                </div>

                {/* Processing Scan Line Bar */}
                {isProcessing && (
                    <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl opacity-80">
                        <motion.div
                            className="h-full bg-gradient-to-r from-transparent via-accent-primary to-transparent"
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        />
                    </div>
                )}
            </BaseNode>
        </div>
    )
})
