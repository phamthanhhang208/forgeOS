import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Rocket } from 'lucide-react'
import { Project } from '@forgeos/shared'
import { toast } from 'sonner'

export function Dashboard() {
    const navigate = useNavigate()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [concept, setConcept] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Use the demo agency ID for now
    const agencyId = 'demo-agency-cuid'

    const { data, isLoading } = useQuery({
        queryKey: ['projects', agencyId],
        queryFn: () => api.listProjects(agencyId, 1),
        refetchInterval: 5000, // refresh every 5s to see remote progress
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (concept.length < 10) return

        setIsSubmitting(true)
        try {
            const { projectId } = await api.createProject({ concept, agencyId })
            navigate(`/studio/${projectId}`)
        } catch (err: any) {
            toast.error('Failed to create project', { description: err.message })
            setIsSubmitting(false)
        }
    }

    const getStatusBadge = (p: Project) => {
        switch (p.status) {
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
            case 'FAILED':
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent-danger/20 text-accent-danger">
                        FAILED
                    </span>
                )
            default:
                return (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-border text-text-muted">
                        {p.status}
                    </span>
                )
        }
    }

    return (
        <div className="min-h-screen bg-bg-base text-text-primary p-8 font-sans">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black font-mono tracking-tight text-text-primary">
                            ⚡ ForgeOS Node Studio
                        </h1>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-text-primary text-bg-base px-4 py-2 rounded-md font-bold text-sm hover:bg-white/90 transition-colors"
                    >
                        <Plus size={16} />
                        New Project
                    </button>
                </header>

                <main>
                    <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">
                        Your Projects
                    </h2>

                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="animate-spin text-text-muted" />
                        </div>
                    ) : data?.projects.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-border rounded-xl text-text-muted">
                            No projects yet. Create one to get started!
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {data?.projects.map((project) => (
                                <div
                                    key={project.id}
                                    className="bg-bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent-primary/50 transition-colors cursor-pointer"
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
                                            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                                            <span>·</span>
                                            <span>Node {project.currentNode}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex gap-2">
                                        <button
                                            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-bg-elevated text-text-primary border border-border hover:bg-border transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigate(`/studio/${project.id}`)
                                            }}
                                        >
                                            Open Studio
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {isModalOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => !isSubmitting && setIsModalOpen(false)}
                    />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-bg-surface border border-border rounded-xl shadow-2xl z-50 p-6 flex flex-col gap-5">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Launch New Project</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSubmitting}
                                className="text-text-muted hover:text-text-primary"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-text-muted">
                                    Your SaaS Idea
                                </label>
                                <textarea
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                    disabled={isSubmitting}
                                    placeholder='e.g. "Client portal for a law firm"'
                                    className="w-full h-28 bg-bg-base border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all resize-none"
                                    autoFocus
                                />
                            </div>

                            <div className="text-xs text-text-muted bg-bg-elevated p-3 rounded-md border border-border">
                                <span className="font-bold text-text-primary">Tip:</span> Be specific. Include the target audience and the core problem you're solving.
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={concept.length < 10 || isSubmitting}
                                    className="bg-accent-primary text-bg-base px-5 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Rocket size={16} />
                                    )}
                                    Deploy to Pipeline
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    )
}
