import { memo } from 'react'
import { Position } from '@xyflow/react'
import { CheckCircle2, Circle, Cog } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { usePipelineStore } from '../../store/pipeline.store'
import { NodeStatus } from '@forgeos/shared'

export const ShipyardNode = memo(({ data }: { data: any }) => {
    const deployment = usePipelineStore((s) => s.deployment)
    const isComplete =
        deployment?.stepADone &&
        deployment?.stepBDone &&
        deployment?.stepCDone &&
        deployment?.stepDDone

    const isLocked = data.status === NodeStatus.LOCKED
    const isProcessing = data.status === NodeStatus.PROCESSING

    const steps = [
        { label: 'Clone boilerplate', done: deployment?.stepADone },
        { label: 'Inject schema & endpoints', done: deployment?.stepBDone },
        { label: 'Push to GitHub', done: deployment?.stepCDone },
        { label: 'Deploy to DigitalOcean', done: deployment?.stepDDone },
    ]

    return (
        <BaseNode
            label="🛳️ The Shipyard"
            sourceHandle={undefined}
            targetHandle={Position.Left}
            className={`${isLocked
                ? 'opacity-40 grayscale border-border/50'
                : isProcessing
                    ? 'border-accent-secondary border-[1.5px]'
                    : 'border-accent-success/50'
                }`}
            glowClass={
                isProcessing ? 'bg-accent-secondary/30 blur-md opacity-50' : ''
            }
        >
            <div className="flex flex-col gap-2 mt-3 text-sm">
                {steps.map((step, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-2 ${step.done ? 'text-text-primary' : 'text-text-muted'
                            }`}
                    >
                        {step.done ? (
                            <CheckCircle2 size={14} className="text-accent-success" />
                        ) : (
                            <Circle size={14} />
                        )}
                        {step.label}
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider">
                    {isLocked ? (
                        <span className="text-text-muted">Locked</span>
                    ) : isComplete ? (
                        <span className="text-accent-success">Deployed</span>
                    ) : (
                        <span className="text-accent-secondary flex items-center gap-1">
                            <Cog size={12} className="animate-spin" /> In Progress
                        </span>
                    )}
                </div>
            </div>
        </BaseNode>
    )
})
