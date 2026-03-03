import { prisma } from '../prisma'
import { gradientClient } from '../lib/gradient'

export async function getRAGContext(
    agencyId: string,
    concept: string,
    topK: number = 3
): Promise<string> {
    // 1. Embed the concept using BGE
    const [embedding] = await gradientClient.embed({ texts: [concept] })

    // 2. Query pgvector with cosine similarity
    const similar = await prisma.$queryRaw<Array<{ projectSummary: string; tags: string[] }>>`
    SELECT "projectSummary", tags
    FROM "AgencyMemory"
    WHERE "agencyId" = ${agencyId}
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${topK}
  `

    // 3. Format as context string
    if (similar.length === 0) return 'No past similar projects found.'

    return similar
        .map(
            (m, i) =>
                `Past Project ${i + 1}:\n${m.projectSummary}\nTags: ${m.tags.join(', ')}`
        )
        .join('\n\n')
}
