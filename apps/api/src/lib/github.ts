import { Octokit } from '@octokit/rest'
import type { AgencySettings } from '@forgeos/shared'

export interface GitHubConfig {
    token: string
    org: string
}

function resolveConfig(settings?: Partial<AgencySettings>): GitHubConfig {
    return {
        token: settings?.githubToken || process.env.GITHUB_TOKEN || '',
        org: settings?.githubOrg || process.env.GITHUB_ORG || '',
    }
}

export const github = {
    createRepo: async (name: string, description: string, settings?: Partial<AgencySettings>) => {
        const cfg = resolveConfig(settings)
        const octokit = new Octokit({ auth: cfg.token })

        // Try org first, fall back to personal account
        try {
            const response = await octokit.repos.createInOrg({
                org: cfg.org,
                name,
                description,
                private: false,
            })
            return response.data
        } catch (e: any) {
            if (e.status === 422) {
                // Repo already exists in org — fetch it
                const response = await octokit.repos.get({ owner: cfg.org, repo: name })
                return response.data
            }
            if (e.status === 404) {
                // Org not found — try as personal repo
                console.log(`[GitHub] Org "${cfg.org}" not found, creating as personal repo`)
                try {
                    const response = await octokit.repos.createForAuthenticatedUser({
                        name,
                        description,
                        private: false,
                    })
                    return response.data
                } catch (e2: any) {
                    if (e2.status === 422) {
                        // Personal repo already exists
                        const { data: user } = await octokit.users.getAuthenticated()
                        const response = await octokit.repos.get({ owner: user.login, repo: name })
                        return response.data
                    }
                    throw e2
                }
            }
            throw e
        }
    },

    createBranch: async (owner: string, repo: string, branchName: string, settings?: Partial<AgencySettings>) => {
        const cfg = resolveConfig(settings)
        const octokit = new Octokit({ auth: cfg.token })

        const repoData = await octokit.repos.get({ owner, repo })
        const mainBranch = repoData.data.default_branch
        const refData = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${mainBranch}`,
        })

        await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: refData.data.object.sha,
        })
    },

    createPR: async (owner: string, repo: string, head: string, title: string, body: string, settings?: Partial<AgencySettings>) => {
        const cfg = resolveConfig(settings)
        const octokit = new Octokit({ auth: cfg.token })

        const repoData = await octokit.repos.get({ owner, repo })
        const response = await octokit.pulls.create({
            owner,
            repo,
            head,
            base: repoData.data.default_branch,
            title,
            body,
        })
        return response.data
    },

    pushDirectory: async (localPath: string, remoteUrl: string, branchName: string = 'main') => {
        const { execFileSync, execSync } = require('child_process')
        const git = (...args: string[]) => execFileSync('git', args, { cwd: localPath, stdio: 'pipe' })
        execSync('rm -rf .git', { cwd: localPath, shell: '/bin/bash' })
        git('init')
        git('config', 'user.email', 'forgeos@shipyard.ai')
        git('config', 'user.name', 'ForgeOS Shipyard')
        git('checkout', '-b', branchName)
        git('add', '.')
        git('commit', '-m', 'ForgeOS Init')
        git('remote', 'add', 'origin', remoteUrl)
        git('push', '-u', 'origin', branchName, '--force')
    },
}
