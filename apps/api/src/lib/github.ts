import { Octokit } from '@octokit/rest'
import fs from 'fs'
import path from 'path'
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

/**
 * Recursively collect all files in a directory as { relativePath, content } pairs.
 * Binary files are base64-encoded; text files are utf-8.
 */
async function collectFiles(
    dir: string,
    base: string = dir,
): Promise<Array<{ relativePath: string; content: string; encoding: 'utf-8' | 'base64' }>> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    const results: Array<{ relativePath: string; content: string; encoding: 'utf-8' | 'base64' }> = []

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relativePath = path.relative(base, fullPath)

        // Skip .git directory
        if (entry.name === '.git') continue

        if (entry.isDirectory()) {
            const sub = await collectFiles(fullPath, base)
            results.push(...sub)
        } else {
            // Read as buffer, try utf-8, fallback to base64
            const buf = await fs.promises.readFile(fullPath)
            // Simple heuristic: if buffer contains null bytes, treat as binary
            const isBinary = buf.includes(0)
            if (isBinary) {
                results.push({ relativePath, content: buf.toString('base64'), encoding: 'base64' })
            } else {
                results.push({ relativePath, content: buf.toString('utf-8'), encoding: 'utf-8' })
            }
        }
    }
    return results
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

    /**
     * Download a repo at a specific ref as a tarball and extract to localPath.
     * Replaces `git clone` + `git checkout` — no git binary needed.
     */
    cloneRepo: async (owner: string, repo: string, ref: string, localPath: string, settings?: Partial<AgencySettings>) => {
        const cfg = resolveConfig(settings)
        const octokit = new Octokit({ auth: cfg.token })

        // Get tarball URL (follows redirect to a signed URL)
        const response = await octokit.repos.downloadTarballArchive({
            owner,
            repo,
            ref,
        })

        // response.data is an ArrayBuffer
        const tarballBuffer = Buffer.from(response.data as ArrayBuffer)

        // Write tarball to a temp file
        const tarballPath = path.join(localPath, '__archive.tar.gz')
        await fs.promises.mkdir(localPath, { recursive: true })
        await fs.promises.writeFile(tarballPath, tarballBuffer)

        // Extract using tar (available on all Linux containers, unlike git)
        const { execFileSync } = require('child_process')
        execFileSync('tar', ['xzf', tarballPath, '--strip-components=1', '-C', localPath], { stdio: 'pipe' })

        // Clean up tarball
        await fs.promises.unlink(tarballPath)
    },

    /**
     * Push an entire local directory to a GitHub repo using the Git Data API.
     * No git binary needed — creates blobs, tree, commit, and updates ref via API.
     */
    pushDirectory: async (localPath: string, owner: string, repo: string, branchName: string = 'main', settings?: Partial<AgencySettings>) => {
        const cfg = resolveConfig(settings)
        const octokit = new Octokit({ auth: cfg.token })

        // 1. Collect all files
        const files = await collectFiles(localPath)
        console.log(`[GitHub] Pushing ${files.length} files to ${owner}/${repo}@${branchName}`)

        // 2. Create blobs for each file
        const treeItems: Array<{
            path: string
            mode: '100644' | '100755'
            type: 'blob'
            sha: string
        }> = []

        for (const file of files) {
            const blob = await octokit.git.createBlob({
                owner,
                repo,
                content: file.encoding === 'base64' ? file.content : Buffer.from(file.content).toString('base64'),
                encoding: 'base64',
            })
            treeItems.push({
                path: file.relativePath,
                mode: '100644',
                type: 'blob',
                sha: blob.data.sha,
            })
        }

        // 3. Create tree
        const tree = await octokit.git.createTree({
            owner,
            repo,
            tree: treeItems,
        })

        // 4. Create commit (no parent — fresh initial commit)
        const commit = await octokit.git.createCommit({
            owner,
            repo,
            message: 'ForgeOS Init',
            tree: tree.data.sha,
            author: {
                name: 'ForgeOS Shipyard',
                email: 'forgeos@shipyard.ai',
                date: new Date().toISOString(),
            },
        })

        // 5. Create or update the branch ref
        try {
            await octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${branchName}`,
                sha: commit.data.sha,
            })
        } catch (e: any) {
            if (e.status === 422) {
                // Branch already exists — force update
                await octokit.git.updateRef({
                    owner,
                    repo,
                    ref: `heads/${branchName}`,
                    sha: commit.data.sha,
                    force: true,
                })
            } else {
                throw e
            }
        }

        console.log(`[GitHub] Push complete: ${commit.data.sha}`)
    },
}
