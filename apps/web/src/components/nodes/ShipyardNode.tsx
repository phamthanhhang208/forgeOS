import { memo } from 'react'
import { Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Cog, ExternalLink, Github, Download, Loader2, RotateCcw } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { usePipelineStore } from '../../store/pipeline.store'
import { NodeStatus } from '@forgeos/shared'
import { api } from '../../lib/api'

export const ShipyardNode = memo(({ data }: { data: { status: NodeStatus } }) => {
    const deployment = usePipelineStore((s) => s.deployment)
    const projectId = usePipelineStore((s) => s.projectId)
    const isComplete =
        deployment?.stepADone &&
        deployment?.stepBDone &&
        deployment?.stepCDone &&
        deployment?.stepDDone

    const isLocked = data.status === NodeStatus.LOCKED
    const isProcessing = data.status === NodeStatus.PROCESSING
    const isFailed = data.status === NodeStatus.FAILED
    const retryNode = usePipelineStore((s) => s.retryNode)

    // Steps match shipyard.ts: A=Clone+Inject, B=Push to GitHub, C=Deploy to DO, D=Poll active
    const steps = [
        { label: 'Clone & inject schema', done: deployment?.stepADone },
        { label: 'Push to GitHub', done: deployment?.stepBDone },
        { label: 'Deploy to DigitalOcean', done: deployment?.stepCDone },
        { label: 'Build active', done: deployment?.stepDDone },
    ]

    return (
        <BaseNode
            label="The Shipyard"
            sourceHandle={undefined}
            targetHandle={Position.Left}
            className={`${isLocked
                ? 'opacity-40 grayscale border-border/50'
                : isComplete
                    ? 'border-accent-success/50'
                    : isFailed
                        ? 'border-accent-danger/50'
                        : isProcessing
                            ? 'border-accent-secondary border-[1.5px]'
                            : 'border-border/50'
                } ${isComplete ? 'w-[260px]' : 'w-[220px]'}`}
            glowClass={
                isProcessing ? 'bg-accent-secondary/30 blur-md opacity-50' : ''
            }
        >
            <div className="flex flex-col gap-1.5 mt-3 text-sm">
                {steps.map((step, i) => (
                    <motion.div
                        key={i}
                        initial={false}
                        animate={step.done ? { opacity: 1, x: 0 } : { opacity: isLocked ? 0.3 : 0.6, x: 0 }}
                        transition={{ delay: step.done ? i * 0.15 : 0, duration: 0.3 }}
                        className={`flex items-center gap-2 ${step.done ? 'text-text-primary' : 'text-text-muted'
                            }`}
                    >
                        {step.done ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: i * 0.15 }}
                            >
                                <CheckCircle2 size={14} className="text-accent-success" />
                            </motion.div>
                        ) : isProcessing && !step.done && (i === 0 || steps[i - 1]?.done) ? (
                            <Loader2 size={14} className="animate-spin text-accent-secondary" />
                        ) : (
                            <Circle size={14} />
                        )}
                        <span className="text-xs">{step.label}</span>
                    </motion.div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border">
                {isLocked ? (
                    <div className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Locked
                    </div>
                ) : isComplete ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-accent-success">
                            Deployed
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {deployment?.githubRepoUrl && (
                                <a
                                    href={deployment.githubRepoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-semibold bg-bg-elevated border border-border rounded px-2 py-1 text-text-primary hover:border-accent-primary/50 transition-colors animate-tada"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Github size={10} /> GitHub
                                </a>
                            )}
                            {deployment?.doAppUrl && (
                                <a
                                    href={deployment.doAppUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-semibold bg-accent-primary/10 border border-accent-primary/30 rounded px-2 py-1 text-accent-primary hover:bg-accent-primary/20 transition-colors animate-tada"
                                    style={{ animationDelay: '0.1s' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <ExternalLink size={10} /> Live App
                                </a>
                            )}
                            {projectId && deployment?.zipReady && (
                                <a
                                    href={api.downloadLocalStack(projectId)}
                                    className="flex items-center gap-1 text-[10px] font-semibold bg-bg-elevated border border-border rounded px-2 py-1 text-text-muted hover:text-text-primary transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download size={10} /> ZIP
                                </a>
                            )}
                        </div>
                    </div>
                ) : isFailed ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-accent-danger">
                            Failed
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                retryNode(4)
                            }}
                            className="nodrag flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-accent-danger/10 border border-accent-danger/30 text-accent-danger rounded-md px-3 py-1.5 hover:bg-accent-danger/20 transition-colors"
                        >
                            <RotateCcw size={11} /> Retry
                        </button>
                    </div>
                ) : (
                    <div className="text-xs font-bold uppercase tracking-wider text-accent-secondary flex items-center gap-1">
                        <Cog size={12} className="animate-spin" /> In Progress
                    </div>
                )}
            </div>
        </BaseNode>
    )
})
