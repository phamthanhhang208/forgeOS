import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Rocket, Settings, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsModal } from '../components/modals/SettingsModal';
import { ConceptWizard } from '../components/modals/ConceptWizard';
function SkeletonCard() {
    return (_jsxs("div", { className: "bg-bg-surface border border-border rounded-xl p-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 flex-1", children: [_jsx("div", { className: "skeleton h-5 w-3/4" }), _jsx("div", { className: "skeleton h-3 w-1/3" })] }), _jsx("div", { className: "skeleton h-8 w-24 rounded-md" })] }));
}
export function Dashboard() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const queryClient = useQueryClient();
    const agencyId = 'demo-agency-cuid';
    const { data, isLoading } = useQuery({
        queryKey: ['projects', agencyId],
        queryFn: () => api.listProjects(agencyId, 1),
        staleTime: 30_000,
        refetchInterval: 5000,
    });
    const handleProjectSubmit = async (concept) => {
        try {
            const { projectId } = await api.createProject({ concept, agencyId });
            navigate(`/studio/${projectId}`);
        }
        catch (err) {
            toast.error('Failed to create project', { description: err instanceof Error ? err.message : 'Unknown error' });
            throw err;
        }
    };
    const getStatusBadge = (p) => {
        switch (p.status) {
            case 'COMPLETED':
                return (_jsx("span", { className: "px-2 py-0.5 rounded text-xs font-bold bg-accent-success/20 text-accent-success", children: "COMPLETED" }));
            case 'AWAITING_REVIEW':
                return (_jsx("span", { className: "px-2 py-0.5 rounded text-xs font-bold bg-accent-primary/20 text-accent-primary animate-pulse", children: "AWAITING REVIEW" }));
            case 'RUNNING':
                return (_jsx("span", { className: "px-2 py-0.5 rounded text-xs font-bold bg-accent-secondary/20 text-accent-secondary animate-pulse", children: "RUNNING" }));
            case 'FAILED':
                return (_jsx("span", { className: "px-2 py-0.5 rounded text-xs font-bold bg-accent-danger/20 text-accent-danger", children: "FAILED" }));
            default:
                return (_jsx("span", { className: "px-2 py-0.5 rounded text-xs font-bold bg-border text-text-muted", children: p.status }));
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-bg-base text-text-primary p-8 font-sans overflow-auto", children: [_jsxs("div", { className: "max-w-4xl mx-auto flex flex-col gap-6", children: [_jsxs("header", { className: "flex items-center justify-between pb-4 border-b border-border", children: [_jsx("div", { className: "flex items-center gap-3", children: _jsxs("h1", { className: "text-2xl font-black font-mono tracking-tight text-text-primary flex items-center gap-2", children: [_jsx(Zap, { size: 24, className: "text-accent-primary" }), "ForgeOS Node Studio"] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setIsSettingsOpen(true), className: "flex items-center justify-center w-9 h-9 rounded-md bg-bg-elevated border border-border text-text-muted hover:text-text-primary hover:border-accent-primary/50 transition-colors", title: "Agency Settings", children: _jsx(Settings, { size: 16 }) }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "flex items-center gap-2 bg-accent-primary text-bg-base px-4 py-2 rounded-md font-bold text-sm hover:bg-[#00e5ff] transition-colors shadow-lg shadow-accent-primary/20", children: [_jsx(Plus, { size: 16 }), "New Project"] })] })] }), _jsxs("main", { children: [_jsx("h2", { className: "text-sm font-bold text-text-muted uppercase tracking-wider mb-4", children: "Your Projects" }), isLoading ? (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(SkeletonCard, {}), _jsx(SkeletonCard, {}), _jsx(SkeletonCard, {})] })) : data?.projects.length === 0 ? (_jsxs("div", { className: "text-center py-16 border border-dashed border-border rounded-xl flex flex-col items-center gap-4", children: [_jsx("div", { className: "w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center", children: _jsx(Rocket, { size: 28, className: "text-text-muted" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-text-primary font-semibold text-lg", children: "No projects yet" }), _jsx("p", { className: "text-text-muted text-sm mt-1", children: "Describe a SaaS idea and let our AI agents build it for you." })] }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "flex items-center gap-2 bg-accent-primary text-bg-base px-5 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] transition-colors mt-2", children: [_jsx(Plus, { size: 16 }), " Create Your First Project"] })] })) : (_jsx("div", { className: "flex flex-col gap-3", children: data?.projects.map((project) => (_jsxs("div", { className: "bg-bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-accent-primary/50 hover:shadow-lg hover:shadow-accent-primary/5 transition-all cursor-pointer group", onClick: () => navigate(`/studio/${project.id}`), children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("h3", { className: "font-semibold text-text-primary text-base line-clamp-1 max-w-[400px]", children: project.concept }), getStatusBadge(project)] }), _jsxs("div", { className: "text-xs text-text-muted flex items-center gap-2", children: [_jsxs("span", { children: ["Created", ' ', new Date(project.createdAt).toLocaleDateString()] }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: ["Node ", project.currentNode] })] })] }), _jsxs("div", { className: "shrink-0 flex gap-2", children: [_jsx("button", { className: "text-xs font-semibold px-3 py-1.5 rounded-md bg-bg-elevated text-text-primary border border-border hover:bg-border group-hover:border-accent-primary/30 transition-colors", onClick: (e) => {
                                                        e.stopPropagation();
                                                        navigate(`/studio/${project.id}`);
                                                    }, children: "Open Studio" }), _jsx("button", { className: "text-xs px-2 py-1.5 rounded-md bg-bg-elevated border border-border text-text-muted hover:text-accent-danger hover:border-accent-danger/30 hover:bg-accent-danger/10 transition-colors", title: "Delete project", onClick: async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm(`Delete "${project.concept}"?`))
                                                            return;
                                                        try {
                                                            await api.deleteProject(project.id);
                                                            queryClient.invalidateQueries({ queryKey: ['projects'] });
                                                            toast.success('Project deleted');
                                                        }
                                                        catch (err) {
                                                            toast.error('Failed to delete', { description: err instanceof Error ? err.message : 'Unknown error' });
                                                        }
                                                    }, children: _jsx(Trash2, { size: 14 }) })] })] }, project.id))) }))] })] }), isModalOpen && (_jsx(ConceptWizard, { agencyId: agencyId, onClose: () => setIsModalOpen(false), onSubmit: handleProjectSubmit })), isSettingsOpen && (_jsx(SettingsModal, { agencyId: agencyId, onClose: () => setIsSettingsOpen(false) }))] }));
}
