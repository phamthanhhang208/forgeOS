import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Rocket, Settings, Trash2, Zap } from 'lucide-react'
import { NodeStatus, Project, ProjectStatus } from '@forgeos/shared'
import { toast } from 'sonner'
import { SettingsModal } from '../components/modals/SettingsModal'
import { ConceptWizard } from '../components/modals/ConceptWizard'

function SkeletonCard() {
    return (
        <div className="bg-bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex flex-col gap-2 flex-1">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-1/3" />
            </div>
            <div className="skeleton h-8 w-24 rounded-md" />
        </div>
    )
}

export function Dashboard() {
    const navigate = useNavigate()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const queryClient = useQueryClient()

    const agencyId = 'demo-agency-cuid'

    const { data, isLoading } = useQuery({
        queryKey: ['projects', agencyId],
        queryFn: () => api.listProjects(agencyId, 1),
        staleTime: 30_000,
        refetchInterval: 5000,
    })

    const handleProjectSubmit = async (concept: string) => {
        try {
            const { projectId } = await api.createProject({ concept, agencyId })
            navigate(`/studio/${projectId}`)
        } catch (err: unknown) {
            toast.error('Failed to create project', { description: err instanceof Error ? err.message : 'Unknown error' })
            throw err
        }
    }

    const getLatestByNode = (p: Project) => {
        const outputs = p.agentOutputs ?? []
        const latestByNode = new Map<number, (typeof outputs)[number]>()
        for (const output of outputs) {
            const prev = latestByNode.get(output.nodeId)
            if (!prev || output.version > prev.version) {
                latestByNode.set(output.nodeId, output)
            }
        }
        return latestByNode
    }

    const getEffectiveStatus = (p: Project): ProjectStatus => {
        const latestByNode = getLatestByNode(p)

        const latestStatuses = Array.from(latestByNode.values()).map((o) => o.status)

        if (latestStatuses.includes(NodeStatus.FAILED)) {
            return ProjectStatus.FAILED
        }

        const shipyardStatus = latestByNode.get(4)?.status
        const isDeploymentComplete =
            shipyardStatus === NodeStatus.APPROVED ||
            p.deployment?.buildStatus === 'ACTIVE' ||
            !!p.deployment?.stepDDone ||
            p.status === ProjectStatus.COMPLETED
        if (isDeploymentComplete) {
            return ProjectStatus.COMPLETED
        }

        if (latestStatuses.includes(NodeStatus.REVIEW)) {
            return ProjectStatus.AWAITING_REVIEW
        }

        if (
            latestStatuses.some((s) =>
                [NodeStatus.QUEUED, NodeStatus.PROCESSING, NodeStatus.REGENERATING].includes(s)
            )
        ) {
            return ProjectStatus.RUNNING
        }

        return p.status
    }

    const getDisplayNode = (p: Project): number => {
        const latestByNode = getLatestByNode(p)

        const failedNode = Array.from(latestByNode.values())
            .filter((o) => o.status === NodeStatus.FAILED)
            .sort((a, b) => b.version - a.version)[0]
        if (failedNode) return failedNode.nodeId

        const reviewNode = Array.from(latestByNode.values())
            .find((o) => o.status === NodeStatus.REVIEW)
        if (reviewNode) return reviewNode.nodeId

        const activeNode = Array.from(latestByNode.values())
            .find((o) => [NodeStatus.QUEUED, NodeStatus.PROCESSING, NodeStatus.REGENERATING].includes(o.status))
        if (activeNode) return activeNode.nodeId

        if (
            latestByNode.get(4)?.status === NodeStatus.APPROVED ||
            p.deployment?.buildStatus === 'ACTIVE' ||
            p.deployment?.stepDDone
        ) {
            return 4
        }

        return p.currentNode
    }

    const getStatusBadge = (p: Project) => {
        const status = getEffectiveStatus(p)
        switch (status) {
            case 'COMPLETED':
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-success/20 text-accent-success">
                        COMPLETED
                    </span>
                )
            case 'AWAITING_REVIEW':
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-primary/20 text-accent-primary animate-pulse">
                        AWAITING REVIEW
                    </span>
                )
            case 'RUNNING':
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-secondary/20 text-accent-secondary animate-pulse">
                        RUNNING
                    </span>
                )
            case 'FAILED':
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-danger/20 text-accent-danger">
                        FAILED
                    </span>
                )
            default:
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-border text-text-muted">
                        {status}
                    </span>
                )
        }
    }

    return (
        <div className="min-h-screen bg-bg-base text-text-primary p-8 font-sans overflow-auto">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black font-mono tracking-tight text-text-primary flex items-center gap-2">
                            <Zap size={24} className="text-accent-primary" />
                            ForgeOS Node Studio
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center justify-center w-9 h-9 rounded-md bg-bg-elevated border border-border text-text-muted hover:text-text-primary hover:border-accent-primary/50 transition-colors"
                            title="Agency Settings"
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-accent-primary text-bg-base px-4 py-2 rounded-md font-bold text-sm hover:bg-[#00e5ff] transition-colors shadow-lg shadow-accent-primary/20"
                        >
                            <Plus size={16} />
                            New Project
                        </button>
                    </div>
                </header>

                <main>
                    <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
                        Your Projects
                    </h2>

                    {isLoading ? (
                        <div className="flex flex-col gap-3">
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ) : data?.projects.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-border rounded-xl flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center">
                                <Rocket size={28} className="text-text-muted" />
                            </div>
                            <div>
                                <p className="text-text-primary font-semibold text-lg">
                                    No projects yet
                                </p>
                                <p className="text-text-muted text-sm mt-1">
                                    Describe a SaaS idea and let our AI agents build it for
                                    you.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 bg-accent-primary text-bg-base px-5 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] transition-colors mt-2"
                            >
                                <Plus size={16} /> Create Your First Project
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {data?.projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5 transition-all cursor-pointer group"
                                    onClick={() => navigate(`/studio/${project.id}`)}
                                >
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-text-primary text-base line-clamp-1 max-w-[400px]">
                                                {project.concept}
                                            </h3>
                                            {getStatusBadge(project)}
                                        </div>
                                        <div className="text-xs text-text-muted flex items-center gap-2">
                                            <span>
                                                Created{' '}
                                                {new Date(
                                                    project.createdAt
                                                ).toLocaleDateString()}
                                            </span>
                                            <span>·</span>
                                            <span>Node {getDisplayNode(project)}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex gap-2">
                                        <button
                                            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-bg-elevated text-text-primary border border-border hover:bg-border group-hover:border-accent-primary/30 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigate(`/studio/${project.id}`)
                                            }}
                                        >
                                            Open Studio
                                        </button>
                                        <button
                                            className="text-xs px-2 py-1.5 rounded-md bg-bg-elevated border border-border text-text-muted hover:text-accent-danger hover:border-accent-danger/30 hover:bg-accent-danger/10 transition-colors"
                                            title="Delete project"
                                            onClick={async (e) => {
                                                e.stopPropagation()
                                                if (!confirm(`Delete "${project.concept}"?`)) return
                                                try {
                                                    await api.deleteProject(project.id)
                                                    queryClient.invalidateQueries({ queryKey: ['projects'] })
                                                    toast.success('Project deleted')
                                                } catch (err: unknown) {
                                                    toast.error('Failed to delete', { description: err instanceof Error ? err.message : 'Unknown error' })
                                                }
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {isModalOpen && (
                <ConceptWizard
                    agencyId={agencyId}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleProjectSubmit}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal agencyId={agencyId} onClose={() => setIsSettingsOpen(false)} />
            )}
        </div>
    )
}

