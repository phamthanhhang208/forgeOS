// Gradient Knowledge Base RAG — replaces pgvector implementation

const KB_UUID = process.env.DO_KNOWLEDGE_BASE_UUID!
const DO_API_TOKEN = process.env.DO_API_TOKEN!
const KB_ENDPOINT = `https://kbaas.do-ai.run/v1/${KB_UUID}/retrieve`

interface KBChunk {
    text_content: string
    metadata: {
        item_name: string
        ingested_timestamp: string
    }
}

interface KBResponse {
    results: KBChunk[]
}

export async function getRAGContext(
    _agencyId: string, // kept for API compatibility — Gradient KB is shared across agencies
    concept: string,
    topK = 3
): Promise<string> {
    try {
        console.log(`[RAG] → ${KB_ENDPOINT}`)
        console.log(`[RAG] Token: ${DO_API_TOKEN?.slice(0, 15)}...`)
        const res = await fetch(KB_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${DO_API_TOKEN}`,
            },
            body: JSON.stringify({
                query: concept,
                num_results: topK,
                alpha: 0.6, // 0=lexical only, 1=semantic only, 0.6=slightly semantic-biased
            }),
        })

        if (!res.ok) {
            const errorBody = await res.text()
            console.error(`[RAG] ❌ ${res.status} response:`, errorBody)
            return 'No past similar projects found.'
        }

        console.log(`[RAG] ✅ ${res.status} OK`)

        const data: KBResponse = await res.json()

        if (!data.results?.length) {
            return 'No past similar projects found.'
        }

        return data.results
            .map((chunk, i) => `Past Project ${i + 1}:\n${chunk.text_content}`)
            .join('\n\n')
    } catch (err) {
        // Never crash an agent because RAG failed
        console.error('RAG context fetch error:', err)
        return 'No past similar projects found.'
    }
}
