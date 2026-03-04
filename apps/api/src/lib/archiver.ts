import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

export async function createLocalStack({
    projectId,
    localRepoPath,
    envVarsRequired,
}: {
    projectId: string
    localRepoPath: string
    envVarsRequired: string[]
}): Promise<string> {
    const outDir = `/tmp/forgeos/${projectId}`
    await fs.promises.mkdir(outDir, { recursive: true })
    const zipPath = path.join(outDir, 'local-stack.zip')

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath)
        const archive = archiver('zip', { zlib: { level: 9 } })

        output.on('close', () => resolve(zipPath))
        archive.on('error', (err: Error) => reject(err))
        archive.pipe(output)

        archive.glob('**/*', {
            cwd: localRepoPath,
            ignore: ['node_modules/**', '.git/**'],
            dot: true,
        })

        const envExample = envVarsRequired.map(v => `${v}=`).join('\n')
        archive.append(envExample, { name: '.env.example' })

        archive.finalize()
    })
}
