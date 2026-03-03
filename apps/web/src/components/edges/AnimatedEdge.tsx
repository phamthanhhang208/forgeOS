import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

export function AnimatedEdge({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
}: EdgeProps) {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    // We pass isAnimating via data prop
    const isAnimating = data?.isAnimating

    return (
        <>
            {/* Background shadow path */}
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{ ...style, strokeWidth: 2, stroke: 'var(--border)' }}
            />

            {/* Foreground animated dots */}
            {isAnimating && (
                <path
                    d={edgePath}
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth={2}
                    strokeDasharray="4 8"
                    className="animate-flow-dots drop-shadow-[0_0_4px_var(--accent-primary)]"
                />
            )}
        </>
    )
}
