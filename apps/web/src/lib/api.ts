import type { Project } from '@forgeos/shared'

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

export const api = {
    createProject: (body: { concept: string; agencyId: string; mode?: string }) =>
        request<{ projectId: string }>('/api/projects', {
            method: 'POST',
            body: JSON.stringify(body),
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
            body: JSON.stringify({ editedPayload }),
        }),

    rejectNode: (projectId: string, nodeId: number, feedback: string) =>
        request(`/api/projects/${projectId}/nodes/${nodeId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ feedback }),
        }),

    downloadLocalStack: (projectId: string) =>
        `${BASE}/api/projects/${projectId}/download`,
}
