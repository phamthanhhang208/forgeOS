import type { AgencySettings } from '@forgeos/shared'

const DO_API = 'https://api.digitalocean.com/v2'

function getHeaders(settings?: Partial<AgencySettings>) {
    const token = settings?.doApiToken || process.env.DO_API_TOKEN
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
}

export const doClient = {
    createApp: async (params: { name: string; githubRepo: string; branch?: string }, settings?: Partial<AgencySettings>) => {
        const githubToken = settings?.githubToken || process.env.GITHUB_TOKEN || ''
        const res = await fetch(`${DO_API}/apps`, {
            method: 'POST',
            headers: getHeaders(settings),
            body: JSON.stringify({
                spec: {
                    name: params.name,
                    region: 'sgp',
                    services: [{
                        name: 'web',
                        git: {
                            repo_clone_url: `https://${githubToken}@github.com/${params.githubRepo}.git`,
                            branch: params.branch ?? 'main',
                        },
                        build_command: 'npm install && npm run build',
                        run_command: 'npm start',
                        http_port: 3000,
                        instance_size_slug: 'apps-s-1vcpu-0.5gb',
                        instance_count: 1,
                    }],
                },
            }),
        })
        if (!res.ok) throw new Error(`DO API error: ${res.status} ${await res.text()}`)
        const data = await res.json() as { app: { id: string; live_url?: string; default_ingress?: string } }
        return data.app
    },

    getApp: async (appId: string, settings?: Partial<AgencySettings>) => {
        const res = await fetch(`${DO_API}/apps/${appId}`, { headers: getHeaders(settings) })
        if (!res.ok) throw new Error(`DO API error: ${res.status}`)
        const data = await res.json() as { app: { id: string; live_url?: string; default_ingress?: string; active_deployment?: { phase: string } } }
        return data.app
    },

    waitForActive: async (appId: string, settings?: Partial<AgencySettings>, maxPolls = 20, intervalMs = 15000): Promise<string | null> => {
        for (let i = 0; i < maxPolls; i++) {
            await new Promise(r => setTimeout(r, intervalMs))
            const app = await doClient.getApp(appId, settings)
            const phase = app.active_deployment?.phase
            if (phase === 'ACTIVE') return app.live_url ?? app.default_ingress ?? null
            if (phase === 'ERROR' || phase === 'CANCELED') {
                throw new Error(`DO build failed with phase: ${phase}`)
            }
        }
        throw new Error('DO build timed out after 5 minutes')
    },
}
