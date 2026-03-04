const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
async function request(path, options) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return res.json();
}
const isDemoMode = () => new URLSearchParams(window.location.search).get('demo') === 'true';
export const api = {
    createProject: (body) => request('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ ...body, demoMode: body.demoMode ?? isDemoMode() }),
    }),
    clarifyConcept: (body) => request('/api/projects/clarify', {
        method: 'POST',
        body: JSON.stringify({ ...body, demoMode: body.demoMode ?? isDemoMode() }),
    }),
    getProject: (id) => request(`/api/projects/${id}`),
    listProjects: (agencyId, page = 1) => request(`/api/projects?agencyId=${agencyId}&page=${page}`),
    approveNode: (projectId, nodeId, editedPayload) => request(`/api/projects/${projectId}/nodes/${nodeId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ editedPayload, demoMode: isDemoMode() }),
    }),
    rejectNode: (projectId, nodeId, feedback) => request(`/api/projects/${projectId}/nodes/${nodeId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ feedback, demoMode: isDemoMode() }),
    }),
    retryNode: (projectId, nodeId) => request(`/api/projects/${projectId}/nodes/${nodeId}/retry`, {
        method: 'POST',
        body: JSON.stringify({}),
    }),
    startPipeline: (projectId) => request(`/api/projects/${projectId}/start`, { method: 'POST' }),
    resumePipeline: (projectId) => request(`/api/projects/${projectId}/resume`, {
        method: 'POST',
        body: JSON.stringify({ demoMode: isDemoMode() }),
    }),
    deleteProject: (projectId) => request(`/api/projects/${projectId}`, {
        method: 'DELETE',
    }),
    downloadLocalStack: (projectId) => `${BASE}/api/projects/${projectId}/download`,
    getAgencySettings: (agencyId) => request(`/api/agencies/${agencyId}/settings`),
    updateAgencySettings: (agencyId, settings) => request(`/api/agencies/${agencyId}/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
    }),
};
