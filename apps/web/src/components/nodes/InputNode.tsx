import { memo } from 'react'
import { Position } from '@xyflow/react'
import { BaseNode } from './BaseNode'

// Basic input node showing the source concept
export const InputNode = memo(({ data }: { data: any }) => {
    return (
        <BaseNode
            label="💡 Concept Input"
            status="ACTIVE"
            sourceHandle={Position.Right}
        >
            <div className="text-sm border border-border bg-black/40 p-3 rounded-lg mt-2 text-text-muted cursor-default overflow-hidden text-ellipsis line-clamp-3 leading-snug">
                {data.concept || 'Enter a concept to start'}
            </div>
            <div className="text-[10px] text-accent-success uppercase font-bold tracking-wider float-right mt-2">
                ✓ Active
            </div>
            <div className="clear-both" />
        </BaseNode>
    )
})
