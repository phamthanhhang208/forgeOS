import type { Project, AgencySettings, ClarifyQuestion } from '@forgeos/shared'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
    }
    return res.json()
}

const isDemoMode = () =>
    new URLSearchParams(window.location.search).get('demo') === 'true'

export const api = {
    createProject: (body: { concept: string; agencyId: string; mode?: string; demoMode?: boolean }) =>
        request<{ projectId: string }>('/api/projects', {
            method: 'POST',
            body: JSON.stringify({ ...body, demoMode: body.demoMode ?? isDemoMode() }),
        }),

    clarifyConcept: (body: { concept: string; agencyId: string; demoMode?: boolean }) =>
        request<{ questions: ClarifyQuestion[] }>('/api/projects/clarify', {
            method: 'POST',
            body: JSON.stringify({ ...body, demoMode: body.demoMode ?? isDemoMode() }),
        }),

    getProject: (id: string) => request<Project>(`/api/projects/${id}`),

    listProjects: (agencyId: string, page = 1) =>
        request<{ projects: Project[]; total: number }>(
            `/api/projects?agencyId=${agencyId}&page=${page}`
        ),

    approveNode: (
        projectId: string,
        nodeId: number,
        editedPayload?: Record<string, unknown>
    ) =>
        request(`/api/projects/${projectId}/nodes/${nodeId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ editedPayload, demoMode: isDemoMode() }),
        }),

    rejectNode: (projectId: string, nodeId: number, feedback: string) =>
        request(`/api/projects/${projectId}/nodes/${nodeId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ feedback, demoMode: isDemoMode() }),
        }),

    retryNode: (projectId: string, nodeId: number) =>
        request(`/api/projects/${projectId}/nodes/${nodeId}/retry`, {
            method: 'POST',
            body: JSON.stringify({}),
        }),

    startPipeline: (projectId: string) =>
        request(`/api/projects/${projectId}/start`, { method: 'POST' }),

    resumePipeline: (projectId: string) =>
        request(`/api/projects/${projectId}/resume`, {
            method: 'POST',
            body: JSON.stringify({ demoMode: isDemoMode() }),
        }),

    deleteProject: (projectId: string) =>
        request(`/api/projects/${projectId}`, {
            method: 'DELETE',
        }),

    downloadLocalStack: (projectId: string) =>
        `${BASE}/api/projects/${projectId}/download`,

    getAgencySettings: (agencyId: string) =>
        request<AgencySettings>(`/api/agencies/${agencyId}/settings`),

    updateAgencySettings: (agencyId: string, settings: Partial<AgencySettings>) =>
        request<{ success: boolean }>(`/api/agencies/${agencyId}/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings),
        }),
}
