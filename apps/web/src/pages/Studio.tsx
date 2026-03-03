import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { usePipelineStore } from '../store/pipeline.store'
import { useSSE } from '../hooks/useSSE'
import { PipelineCanvas } from '../components/canvas/PipelineCanvas'
import { HITLPanel } from '../components/panels/HITLPanel'
import { Toaster } from 'sonner'
import { Project } from '@forgeos/shared'

export function Studio() {
    const { projectId } = useParams()
    const navigate = useNavigate()

    const setProjectId = usePipelineStore((s) => s.setProjectId)
    const initNodes = usePipelineStore((s) => s.initNodes)
    const handleSSEEvent = usePipelineStore((s) => s.handleSSEEvent)
    const demoMode = usePipelineStore((s) => s.demoMode)

    // Fetch initial state once
    const { data: project, isLoading, error } = useQuery<Project>({
        queryKey: ['project', projectId],
        queryFn: () => api.getProject(projectId!),
        enabled: !!projectId,
        staleTime: Infinity, // Rely on SSE for updates
    })

    // Hydrate store on mount
    useEffect(() => {
        if (projectId) {
            setProjectId(projectId)
            initNodes()
        }
        return () => setProjectId('')
    }, [projectId, setProjectId, initNodes])

    // Hydrate node states from DB fetch
    useEffect(() => {
        if (project?.outputs) {
            project.outputs.forEach((output: any) => {
                handleSSEEvent({
                    type: 'NODE_STATUS',
                    nodeId: output.nodeId,
                    status: output.status,
                })
                if (output.jsonPayload) {
                    handleSSEEvent({
                        type: 'NODE_PAYLOAD',
                        nodeId: output.nodeId,
                        version: output.version,
                        payload: output.jsonPayload as Record<string, unknown>,
                    })
                }
            })
        }

        if (project?.deployment) {
            handleSSEEvent({
                type: 'DEPLOYMENT_COMPLETE',
                githubUrl: project.deployment.githubRepoUrl || '',
                doAppUrl: project.deployment.doAppUrl || '',
                zipReady: project.deployment.zipReady
            } as any)
            // If deployed, assume all steps are done visually
            if (project.deployment.status === 'COMPLETED' as any) {
                const steps = ['A', 'B', 'C', 'D'] as const
                steps.forEach(step => {
                    handleSSEEvent({
                        type: 'SHIPYARD_STEP',
                        step,
                        status: 'DONE',
                    } as any)
                })
            }
        }
    }, [project, handleSSEEvent])

    // Start SSE stream
    useSSE(projectId || null, handleSSEEvent)

    if (isLoading) {
        return (
            <div className="h-screen bg-bg-base flex items-center justify-center">
                <Loader2 className="animate-spin text-accent-primary w-8 h-8" />
            </div>
        )
    }

    if (error || !project) {
        return (
            <div className="h-screen bg-bg-base flex flex-col items-center justify-center text-text-primary gap-4">
                <p>Project not found or failed to load.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-bg-elevated border border-border px-4 py-2 rounded-md"
                >
                    Return to Dashboard
                </button>
            </div>
        )
    }

    return (
        <div className="h-screen w-full flex flex-col bg-bg-base text-text-primary overflow-hidden">
            <Toaster theme="dark" position="bottom-right" />

            {/* Header Bar */}
            <header className="h-14 border-b border-border bg-bg-surface flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-sm font-semibold"
                    >
                        <ArrowLeft size={16} /> Dashboard
                    </button>
                    <div className="h-4 w-[1px] bg-border" />
                    <h1 className="text-sm font-mono truncate max-w-xl">
                        {project.concept}
                    </h1>
                </div>

                {demoMode && (
                    <div className="bg-accent-secondary/20 border border-accent-secondary text-accent-secondary text-xs font-bold px-2 py-1 rounded animate-pulse">
                        DEMO MODE
                    </div>
                )}
            </header>

            {/* Main Workspace */}
            <div className="flex-1 relative">
                <PipelineCanvas concept={project.concept} />
                <HITLPanel />
            </div>
        </div>
    )
}
